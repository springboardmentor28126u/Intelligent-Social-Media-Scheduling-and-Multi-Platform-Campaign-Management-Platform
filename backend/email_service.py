import os
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")


def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    message = Mail(
        from_email=SENDGRID_FROM_EMAIL,
        to_emails=to_email,
        subject="Reset your SocialPilot password",
        html_content=f"""
            <p>You requested a password reset for your SocialPilot account.</p>
            <p><a href="{reset_link}">Click here to reset your password</a></p>
            <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        """,
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"[SendGrid] Email sent, status: {response.status_code}")
        return True
    except Exception as error:
        print(f"[SendGrid] Failed to send email: {error}")
        if hasattr(error, "body"):
            print(f"[SendGrid] Error body: {error.body}")
        return False