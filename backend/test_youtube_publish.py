from database import SessionLocal
from models import SocialAccount
from publishers import publish_youtube

db = SessionLocal()
account = db.query(SocialAccount).filter(SocialAccount.id == 17).first()

success, result = publish_youtube(
    db,
    account,
    'https://download.samplelib.com/mp4/sample-5s.mp4',
    'SocialPilot Test Upload',
    'Testing the SocialPilot publishing engine - Milestone 2 real API call.'
)
print('success:', success)
print('result:', result)
