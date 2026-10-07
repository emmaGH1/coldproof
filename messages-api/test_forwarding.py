import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import requests

directory = tempfile.TemporaryDirectory()
os.environ["OUTBOX_DIR"] = directory.name
os.environ["INGEST_TOKEN"] = "unit-test-only-token"
with patch("threading.Thread.start"):
    import send_data


class ForwardingTests(unittest.TestCase):
    def setUp(self):
        self.client = send_data.app.test_client()
        self.headers = {"Authorization": "Bearer unit-test-only-token"}
        for path in Path(directory.name).glob("*"):
            path.unlink(missing_ok=True)

    def test_publisher_token_required(self):
        self.assertEqual(self.client.post("/upload", json={"tag": "test", "message": {}}).status_code, 401)

    def test_unconfigured_node_rejected(self):
        self.assertEqual(self.client.post("/upload?node=evil.example", json={"tag": "test", "message": {}}, headers=self.headers).status_code, 400)

    @patch("send_data.requests.post")
    @patch("send_data.forward", return_value=False)
    def test_forwarding_failure_keeps_real_insert_receipt_in_outbox(self, _forward, post):
        post.return_value = Mock(json=lambda: {"blockId": "0x" + "a" * 64})
        response = self.client.post("/upload", json={"tag": "test", "message": {"seq": 1}}, headers=self.headers)
        self.assertEqual(response.status_code, 202)
        path = next(Path(directory.name).glob("*.json"))
        self.assertEqual(json.loads(path.read_text())["data"]["seq"], 1)

    @patch("send_data.requests.post", side_effect=requests.ConnectionError())
    def test_insertion_failure_does_not_forward(self, _post):
        response = self.client.post("/upload", json={"tag": "test", "message": {}}, headers=self.headers)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(list(Path(directory.name).glob("*.json")), [])

    @patch("send_data.requests.post")
    @patch("send_data.forward", return_value=True)
    def test_success_returns_block_id_and_forwarding_status(self, _forward, post):
        post.return_value = Mock(json=lambda: {"blockId": "0x" + "b" * 64})
        response = self.client.post("/upload", json={"tag": "test", "message": {"seq": 1}}, headers=self.headers)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json["forwarded"])
        self.assertIn("insertedAt", response.json)

    @patch("send_data.requests.post")
    @patch("pathlib.Path.write_text", side_effect=OSError("disk unavailable"))
    def test_outbox_disk_failure_still_returns_insertion_receipt(self, _write, post):
        post.return_value = Mock(json=lambda: {"blockId": "0x" + "c" * 64})
        response = self.client.post("/upload", json={"tag": "test", "message": {"seq": 1}}, headers=self.headers)
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json["blockId"], "0x" + "c" * 64)
        self.assertFalse(response.json["queued"])


if __name__ == "__main__":
    unittest.main()
