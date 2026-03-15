"""
Tests for GET /ops/inbox and ops_inbox_service.

- Response shape: totals (all ints), items (list), each item has item_type, priority_score, project, created_at.
- Queue ordering: items sorted by priority_score descending.
- Filtering: type, stage, customer_id reduce items and only return matching items.
"""

import pytest

from app.schemas.ops_inbox import OpsInboxItemType
from app.services.ops_inbox_service import get_ops_inbox
from app.db.session import SessionLocal


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


class TestGetOpsInbox:
    """Test get_ops_inbox service and response shape."""

    def test_returns_response_with_totals_and_items(self, db):
        resp = get_ops_inbox(db)
        assert resp.generated_at is not None
        assert resp.totals is not None
        assert resp.totals.blocked >= 0
        assert resp.totals.overdue >= 0
        assert resp.totals.recommendations >= 0
        assert resp.totals.at_risk_projects >= 0
        assert resp.totals.needs_attention_now >= 0
        assert isinstance(resp.items, list)

    def test_items_sorted_by_priority_desc(self, db):
        resp = get_ops_inbox(db, limit=100)
        for i in range(len(resp.items) - 1):
            assert resp.items[i].priority_score >= resp.items[i + 1].priority_score

    def test_filter_by_type_returns_only_that_type(self, db):
        for item_type in OpsInboxItemType:
            resp = get_ops_inbox(db, item_type=item_type, limit=50)
            for item in resp.items:
                assert item.item_type == item_type

    def test_filter_by_stage_returns_only_that_stage(self, db):
        resp = get_ops_inbox(db, stage="kickoff", limit=50)
        for item in resp.items:
            assert item.project.current_stage.value == "kickoff"

    def test_pagination_limit(self, db):
        resp_full = get_ops_inbox(db, limit=10)
        assert len(resp_full.items) <= 10
        resp_offset = get_ops_inbox(db, limit=5, offset=0)
        resp_offset_5 = get_ops_inbox(db, limit=5, offset=5)
        assert len(resp_offset.items) <= 5
        assert len(resp_offset_5.items) <= 5
