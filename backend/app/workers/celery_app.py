"""
Celery configuration for BuckFlow background tasks.

To start the Celery worker:
    celery -A app.workers.celery_app worker --loglevel=info

To start the Celery beat scheduler:
    celery -A app.workers.celery_app beat --loglevel=info

Requires Redis running at REDIS_URL.
"""

import os
from celery import Celery
from celery.schedules import crontab

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "buckflow",
    broker=redis_url,
    backend=redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Lagos",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minute hard limit per task
    task_soft_time_limit=240,  # 4 minute soft limit
    worker_max_tasks_per_child=1000,  # Restart workers periodically
    worker_prefetch_multiplier=1,
)

# ── Periodic tasks (Celery Beat) ──
celery_app.conf.beat_schedule = {
    # Check for appointment reminders every 5 minutes
    "send-appointment-reminders": {
        "task": "app.workers.tasks.send_reminders",
        "schedule": crontab(minute="*/5"),
    },
    # Reset monthly usage counters on the 1st of each month
    "reset-monthly-usage": {
        "task": "app.workers.tasks.reset_monthly_usage",
        "schedule": crontab(day_of_month="1", hour="0", minute="5"),
    },
    # Clean up stale conversations (no messages in 30 days)
    "cleanup-stale-conversations": {
        "task": "app.workers.tasks.cleanup_stale_conversations",
        "schedule": crontab(hour="3", minute="0"),  # 3 AM daily
    },
}
