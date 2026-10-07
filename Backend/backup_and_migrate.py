"""Back up configured PostgreSQL before applying pending migrations locally."""
import os
import argparse
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from alembic import command
from alembic.config import Config
from database import DATABASE_URL


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup-only', action='store_true', help='Create a backup without changing schema')
    args = parser.parse_args()
    if DATABASE_URL.get_backend_name() != 'postgresql':
        raise RuntimeError('Backup requires PostgreSQL')
    root = Path(__file__).resolve().parents[1]
    destination = Path(os.getenv('BACKUP_DIR', str(root / 'backups')))
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '-before-migration.dump')
    executable = os.getenv('PG_DUMP_PATH') or shutil.which('pg_dump') or r'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe'
    environment = os.environ.copy()
    # Credentials are inherited by pg_dump, never placed in its command line.
    for key, value in {'PGHOST': DATABASE_URL.host, 'PGPORT': str(DATABASE_URL.port or 5432),
                       'PGUSER': DATABASE_URL.username, 'PGPASSWORD': DATABASE_URL.password,
                       'PGDATABASE': DATABASE_URL.database}.items():
        if value is not None:
            environment[key] = value
    if DATABASE_URL.query.get('sslmode'):
        environment['PGSSLMODE'] = DATABASE_URL.query['sslmode']
    result = subprocess.run([executable, '--format=custom', '--no-owner', '--no-acl', '--file', str(target)],
                            env=environment, capture_output=True, text=True)
    if result.returncode or not target.exists() or target.stat().st_size == 0:
        raise RuntimeError('Backup failed; migrations were not applied. Check local PostgreSQL access.')
    print('Database backup created:', target.name)
    if args.backup_only:
        return
    config = Config(str(Path(__file__).with_name('alembic.ini')))
    config.set_main_option('script_location', str(Path(__file__).with_name('alembic')))
    command.upgrade(config, 'head')
    command.check(config)
    print('Database migrated and schema verified.')


if __name__ == '__main__':
    main()
