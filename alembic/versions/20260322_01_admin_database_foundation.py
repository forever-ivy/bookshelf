"""add admin database foundation

Revision ID: 20260322_01
Revises:
Create Date: 2026-03-22 22:30:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260322_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("books", sa.Column("category_id", sa.Integer(), nullable=True))
    op.add_column("books", sa.Column("isbn", sa.String(length=32), nullable=True))
    op.add_column("books", sa.Column("barcode", sa.String(length=64), nullable=True))
    op.add_column("books", sa.Column("cover_url", sa.String(length=512), nullable=True))
    op.add_column("books", sa.Column("shelf_status", sa.String(length=32), nullable=True))
    op.create_index("ix_books_category_id", "books", ["category_id"], unique=False)
    op.create_index("ix_books_isbn", "books", ["isbn"], unique=False)
    op.create_index("ix_books_barcode", "books", ["barcode"], unique=False)
    op.create_index("ix_books_shelf_status", "books", ["shelf_status"], unique=False)

    op.add_column("reader_profiles", sa.Column("restriction_status", sa.String(length=32), nullable=True))
    op.add_column("reader_profiles", sa.Column("restriction_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("reader_profiles", sa.Column("risk_flags", sa.JSON(), nullable=True))
    op.add_column("reader_profiles", sa.Column("preference_profile_json", sa.JSON(), nullable=True))
    op.add_column("reader_profiles", sa.Column("segment_code", sa.String(length=64), nullable=True))
    op.create_index("ix_reader_profiles_restriction_status", "reader_profiles", ["restriction_status"], unique=False)
    op.create_index("ix_reader_profiles_segment_code", "reader_profiles", ["segment_code"], unique=False)

    op.add_column("borrow_orders", sa.Column("priority", sa.String(length=32), nullable=True))
    op.add_column("borrow_orders", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("borrow_orders", sa.Column("failure_reason", sa.String(length=255), nullable=True))
    op.add_column("borrow_orders", sa.Column("intervention_status", sa.String(length=64), nullable=True))
    op.add_column("borrow_orders", sa.Column("attempt_count", sa.Integer(), nullable=True))
    op.create_index("ix_borrow_orders_priority", "borrow_orders", ["priority"], unique=False)
    op.create_index("ix_borrow_orders_intervention_status", "borrow_orders", ["intervention_status"], unique=False)

    op.add_column("delivery_orders", sa.Column("priority", sa.String(length=32), nullable=True))
    op.add_column("delivery_orders", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("delivery_orders", sa.Column("failure_reason", sa.String(length=255), nullable=True))
    op.add_column("delivery_orders", sa.Column("intervention_status", sa.String(length=64), nullable=True))
    op.add_column("delivery_orders", sa.Column("attempt_count", sa.Integer(), nullable=True))
    op.create_index("ix_delivery_orders_priority", "delivery_orders", ["priority"], unique=False)
    op.create_index("ix_delivery_orders_intervention_status", "delivery_orders", ["intervention_status"], unique=False)

    op.add_column("robot_units", sa.Column("battery_level", sa.Integer(), nullable=True))
    op.add_column("robot_units", sa.Column("heartbeat_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("robot_tasks", sa.Column("path_json", sa.JSON(), nullable=True))
    op.add_column("robot_tasks", sa.Column("reassigned_from_task_id", sa.Integer(), nullable=True))
    op.add_column("robot_tasks", sa.Column("failure_reason", sa.String(length=255), nullable=True))
    op.add_column("robot_tasks", sa.Column("attempt_count", sa.Integer(), nullable=True))
    op.create_index("ix_robot_tasks_reassigned_from_task_id", "robot_tasks", ["reassigned_from_task_id"], unique=False)
    op.create_foreign_key(
        "fk_robot_tasks_reassigned_from_task_id_robot_tasks",
        "robot_tasks",
        "robot_tasks",
        ["reassigned_from_task_id"],
        ["id"],
    )

    op.create_table(
        "book_categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_book_categories_code", "book_categories", ["code"], unique=True)
    op.create_index("ix_book_categories_name", "book_categories", ["name"], unique=True)
    op.create_index("ix_book_categories_status", "book_categories", ["status"], unique=False)
    op.create_foreign_key(
        "fk_books_category_id_book_categories",
        "books",
        "book_categories",
        ["category_id"],
        ["id"],
    )

    op.create_table(
        "book_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_book_tags_code", "book_tags", ["code"], unique=True)
    op.create_index("ix_book_tags_name", "book_tags", ["name"], unique=True)

    op.create_table(
        "book_tag_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"]),
        sa.ForeignKeyConstraint(["tag_id"], ["book_tags.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("book_id", "tag_id", name="uq_book_tag_link"),
    )
    op.create_index("ix_book_tag_links_book_id", "book_tag_links", ["book_id"], unique=False)
    op.create_index("ix_book_tag_links_tag_id", "book_tag_links", ["tag_id"], unique=False)

    op.create_table(
        "admin_roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_admin_roles_code", "admin_roles", ["code"], unique=True)

    op.create_table(
        "admin_permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_admin_permissions_code", "admin_permissions", ["code"], unique=True)

    op.create_table(
        "admin_role_permissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["permission_id"], ["admin_permissions.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["admin_roles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_admin_role_permission"),
    )
    op.create_index("ix_admin_role_permissions_role_id", "admin_role_permissions", ["role_id"], unique=False)
    op.create_index("ix_admin_role_permissions_permission_id", "admin_role_permissions", ["permission_id"], unique=False)

    op.create_table(
        "admin_role_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["admin_id"], ["admin_accounts.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["admin_roles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("admin_id", "role_id", name="uq_admin_role_assignment"),
    )
    op.create_index("ix_admin_role_assignments_admin_id", "admin_role_assignments", ["admin_id"], unique=False)
    op.create_index("ix_admin_role_assignments_role_id", "admin_role_assignments", ["role_id"], unique=False)

    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("setting_key", sa.String(length=128), nullable=False),
        sa.Column("value_type", sa.String(length=32), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["admin_accounts.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["admin_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("setting_key"),
    )
    op.create_index("ix_system_settings_setting_key", "system_settings", ["setting_key"], unique=True)

    op.create_table(
        "recommendation_placements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("placement_type", sa.String(length=64), nullable=False),
        sa.Column("config_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_recommendation_placements_code", "recommendation_placements", ["code"], unique=True)
    op.create_index("ix_recommendation_placements_status", "recommendation_placements", ["status"], unique=False)

    op.create_table(
        "topic_booklists",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("audience_segment", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_topic_booklists_slug", "topic_booklists", ["slug"], unique=True)
    op.create_index("ix_topic_booklists_status", "topic_booklists", ["status"], unique=False)

    op.create_table(
        "topic_booklist_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("topic_booklist_id", sa.Integer(), nullable=False),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("rank_position", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"]),
        sa.ForeignKeyConstraint(["topic_booklist_id"], ["topic_booklists.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("topic_booklist_id", "book_id", name="uq_topic_booklist_book"),
    )
    op.create_index("ix_topic_booklist_items_topic_booklist_id", "topic_booklist_items", ["topic_booklist_id"], unique=False)
    op.create_index("ix_topic_booklist_items_book_id", "topic_booklist_items", ["book_id"], unique=False)

    op.create_table(
        "alert_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=128), nullable=True),
        sa.Column("alert_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("acknowledged_by", sa.Integer(), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.Integer(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["acknowledged_by"], ["admin_accounts.id"]),
        sa.ForeignKeyConstraint(["resolved_by"], ["admin_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alert_records_source_type", "alert_records", ["source_type"], unique=False)
    op.create_index("ix_alert_records_source_id", "alert_records", ["source_id"], unique=False)
    op.create_index("ix_alert_records_alert_type", "alert_records", ["alert_type"], unique=False)
    op.create_index("ix_alert_records_severity", "alert_records", ["severity"], unique=False)
    op.create_index("ix_alert_records_status", "alert_records", ["status"], unique=False)
    op.create_index("ix_alert_records_created_at", "alert_records", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_alert_records_created_at", table_name="alert_records")
    op.drop_index("ix_alert_records_status", table_name="alert_records")
    op.drop_index("ix_alert_records_severity", table_name="alert_records")
    op.drop_index("ix_alert_records_alert_type", table_name="alert_records")
    op.drop_index("ix_alert_records_source_id", table_name="alert_records")
    op.drop_index("ix_alert_records_source_type", table_name="alert_records")
    op.drop_table("alert_records")

    op.drop_index("ix_topic_booklist_items_book_id", table_name="topic_booklist_items")
    op.drop_index("ix_topic_booklist_items_topic_booklist_id", table_name="topic_booklist_items")
    op.drop_table("topic_booklist_items")

    op.drop_index("ix_topic_booklists_status", table_name="topic_booklists")
    op.drop_index("ix_topic_booklists_slug", table_name="topic_booklists")
    op.drop_table("topic_booklists")

    op.drop_index("ix_recommendation_placements_status", table_name="recommendation_placements")
    op.drop_index("ix_recommendation_placements_code", table_name="recommendation_placements")
    op.drop_table("recommendation_placements")

    op.drop_index("ix_system_settings_setting_key", table_name="system_settings")
    op.drop_table("system_settings")

    op.drop_index("ix_admin_role_assignments_role_id", table_name="admin_role_assignments")
    op.drop_index("ix_admin_role_assignments_admin_id", table_name="admin_role_assignments")
    op.drop_table("admin_role_assignments")

    op.drop_index("ix_admin_role_permissions_permission_id", table_name="admin_role_permissions")
    op.drop_index("ix_admin_role_permissions_role_id", table_name="admin_role_permissions")
    op.drop_table("admin_role_permissions")

    op.drop_index("ix_admin_permissions_code", table_name="admin_permissions")
    op.drop_table("admin_permissions")

    op.drop_index("ix_admin_roles_code", table_name="admin_roles")
    op.drop_table("admin_roles")

    op.drop_index("ix_book_tag_links_tag_id", table_name="book_tag_links")
    op.drop_index("ix_book_tag_links_book_id", table_name="book_tag_links")
    op.drop_table("book_tag_links")

    op.drop_index("ix_book_tags_name", table_name="book_tags")
    op.drop_index("ix_book_tags_code", table_name="book_tags")
    op.drop_table("book_tags")

    op.drop_index("ix_book_categories_status", table_name="book_categories")
    op.drop_index("ix_book_categories_name", table_name="book_categories")
    op.drop_index("ix_book_categories_code", table_name="book_categories")
    op.drop_table("book_categories")

    op.drop_constraint("fk_robot_tasks_reassigned_from_task_id_robot_tasks", "robot_tasks", type_="foreignkey")
    op.drop_index("ix_robot_tasks_reassigned_from_task_id", table_name="robot_tasks")
    op.drop_column("robot_tasks", "attempt_count")
    op.drop_column("robot_tasks", "failure_reason")
    op.drop_column("robot_tasks", "reassigned_from_task_id")
    op.drop_column("robot_tasks", "path_json")

    op.drop_column("robot_units", "heartbeat_at")
    op.drop_column("robot_units", "battery_level")

    op.drop_index("ix_delivery_orders_intervention_status", table_name="delivery_orders")
    op.drop_index("ix_delivery_orders_priority", table_name="delivery_orders")
    op.drop_column("delivery_orders", "attempt_count")
    op.drop_column("delivery_orders", "intervention_status")
    op.drop_column("delivery_orders", "failure_reason")
    op.drop_column("delivery_orders", "due_at")
    op.drop_column("delivery_orders", "priority")

    op.drop_index("ix_borrow_orders_intervention_status", table_name="borrow_orders")
    op.drop_index("ix_borrow_orders_priority", table_name="borrow_orders")
    op.drop_column("borrow_orders", "attempt_count")
    op.drop_column("borrow_orders", "intervention_status")
    op.drop_column("borrow_orders", "failure_reason")
    op.drop_column("borrow_orders", "due_at")
    op.drop_column("borrow_orders", "priority")

    op.drop_index("ix_reader_profiles_segment_code", table_name="reader_profiles")
    op.drop_index("ix_reader_profiles_restriction_status", table_name="reader_profiles")
    op.drop_column("reader_profiles", "segment_code")
    op.drop_column("reader_profiles", "preference_profile_json")
    op.drop_column("reader_profiles", "risk_flags")
    op.drop_column("reader_profiles", "restriction_until")
    op.drop_column("reader_profiles", "restriction_status")

    op.drop_constraint("fk_books_category_id_book_categories", "books", type_="foreignkey")
    op.drop_index("ix_books_shelf_status", table_name="books")
    op.drop_index("ix_books_barcode", table_name="books")
    op.drop_index("ix_books_isbn", table_name="books")
    op.drop_index("ix_books_category_id", table_name="books")
    op.drop_column("books", "shelf_status")
    op.drop_column("books", "cover_url")
    op.drop_column("books", "barcode")
    op.drop_column("books", "isbn")
    op.drop_column("books", "category_id")
