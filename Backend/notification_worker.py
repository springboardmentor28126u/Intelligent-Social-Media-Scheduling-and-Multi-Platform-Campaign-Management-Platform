"""Run independently: python notification_worker.py [--once]."""
import argparse
import logging
import time
from database import SessionLocal
from notifications import scan_events, deliver_batch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--interval", type=int, default=60)
    args = parser.parse_args()
    if args.interval < 1:
        parser.error("interval must be positive")
    while True:
        try:
            with SessionLocal() as db:
                scan_events(db)
            deliver_batch()
        except Exception:
            logging.error("Notification cycle failed; check database and configuration")
            if args.once:
                raise SystemExit(1)
        if args.once:
            return
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
