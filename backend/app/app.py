from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import hashlib
import json
import os

# Supabase
from supabase import create_client, Client


# ==============================
# FLASK APP
# ==============================

app = Flask(__name__)
CORS(app)


# ==============================
# SUPABASE CONFIG
# ==============================

SUPABASE_URL = "https://tdymdonqtqsabynderrx.supabase.co"

SUPABASE_KEY = "sb_publishable_BgL-2MLmdyucgE2oNtXLZA_zbVoFuM-"

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# ==============================
# JWT CONFIG
# ==============================

SECRET_KEY = "socialpilot-secret-key"


# ==============================
# USER FILE
# ==============================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

USERS_FILE = os.path.join(
    BASE_DIR,
    "users.json"
)


# ==============================
# USER STORAGE
# ==============================

def load_users():

    if not os.path.exists(USERS_FILE):
        return []

    try:

        with open(
            USERS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    except Exception:

        return []


def save_users():

    with open(
        USERS_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            users,
            file,
            indent=4
        )


users = load_users()


# ==============================
# PASSWORD HASH
# ==============================

def hash_password(password):

    return hashlib.sha256(
        password.encode("utf-8")
    ).hexdigest()


# ==============================
# JWT TOKEN
# ==============================

def create_token(user):

    payload = {

        "user_id": user["id"],

        "name": user["name"],

        "email": user["email"],

        "exp": datetime.datetime.now(
            datetime.timezone.utc
        ) + datetime.timedelta(
            hours=24
        )
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )


# ==============================
# HOME
# ==============================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "success": True,

        "message":
            "SocialPilot Backend is running!",

        "status": "success"
    })


# ==============================
# REGISTER
# ==============================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register():

    data = request.get_json(
        silent=True
    ) or {}

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )


    # Validate name

    if not name:

        return jsonify({

            "success": False,

            "message":
                "Name is required"

        }), 400


    # Validate email

    if not email:

        return jsonify({

            "success": False,

            "message":
                "Email is required"

        }), 400


    # Validate password

    if not password:

        return jsonify({

            "success": False,

            "message":
                "Password is required"

        }), 400


    if len(password) < 6:

        return jsonify({

            "success": False,

            "message":
                "Password must be at least 6 characters"

        }), 400


    # Check duplicate email

    for user in users:

        if user["email"] == email:

            return jsonify({

                "success": False,

                "message":
                    "Email already registered"

            }), 409


    # Generate ID

    new_id = max(

        [
            user["id"]
            for user in users
        ],

        default=0

    ) + 1


    # Create user

    user = {

        "id": new_id,

        "name": name,

        "email": email,

        "password":
            hash_password(password)
    }


    users.append(user)

    save_users()


    # Generate JWT

    token = create_token(user)


    return jsonify({

        "success": True,

        "message":
            "Registration successful",

        "token": token,

        "user": {

            "id": user["id"],

            "name": user["name"],

            "email": user["email"]

        }

    }), 201


# ==============================
# LOGIN
# ==============================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login():

    data = request.get_json(
        silent=True
    ) or {}


    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )


    if not email or not password:

        return jsonify({

            "success": False,

            "message":
                "Email and password are required"

        }), 400


    password_hash = hash_password(
        password
    )


    for user in users:

        if (

            user["email"] == email

            and

            user["password"]
            == password_hash

        ):

            token = create_token(user)


            return jsonify({

                "success": True,

                "message":
                    "Login successful",

                "token": token,

                "user": {

                    "id": user["id"],

                    "name": user["name"],

                    "email": user["email"]

                }

            })


    return jsonify({

        "success": False,

        "message":
            "Invalid email or password"

    }), 401


# ==============================
# PROFILE
# ==============================

@app.route(
    "/api/profile",
    methods=["GET"]
)
def profile():

    authorization = request.headers.get(
        "Authorization",
        ""
    )


    if not authorization.startswith(
        "Bearer "
    ):

        return jsonify({

            "success": False,

            "message":
                "Authorization token required"

        }), 401


    token = authorization.split(
        " ",
        1
    )[1]


    try:

        decoded = jwt.decode(

            token,

            SECRET_KEY,

            algorithms=["HS256"]

        )


        return jsonify({

            "success": True,

            "message":
                "Token is valid",

            "user": decoded

        })


    except jwt.ExpiredSignatureError:

        return jsonify({

            "success": False,

            "message":
                "Token expired"

        }), 401


    except jwt.InvalidTokenError:

        return jsonify({

            "success": False,

            "message":
                "Invalid token"

        }), 401


# ==============================
# USER COUNT
# ==============================

@app.route(
    "/api/users/count",
    methods=["GET"]
)
def users_count():

    return jsonify({

        "success": True,

        "count": len(users)

    })


# ==================================================
# MILESTONE 2
# UPDATE POST
# ==================================================

@app.route(
    "/api/posts/<int:post_id>",
    methods=["PUT"]
)
def update_post(post_id):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        # Build update data

        update_data = {}


        if "content" in data:

            update_data["content"] = (
                data.get("content")
            )


        if "scheduled_at" in data:

            update_data["scheduled_at"] = (
                data.get("scheduled_at")
            )


        if "status" in data:

            update_data["status"] = (
                data.get("status")
            )


        # If no data provided

        if not update_data:

            return jsonify({

                "success": False,

                "message":
                    "No update data provided"

            }), 400


        # Update Supabase post

        response = (

            supabase

            .table("posts")

            .update(update_data)

            .eq("id", post_id)

            .execute()

        )


        return jsonify({

            "success": True,

            "message":
                "Post updated successfully",

            "post":
                response.data

        }), 200


    except Exception as e:

        print(
            "Update post error:",
            str(e)
        )


        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ==================================================
# MILESTONE 2
# DELETE POST
# ==================================================

@app.route(
    "/api/posts/<int:post_id>",
    methods=["DELETE"]
)
def delete_post(post_id):

    try:

        # Delete post from Supabase

        response = (

            supabase

            .table("posts")

            .delete()

            .eq("id", post_id)

            .execute()

        )


        return jsonify({

            "success": True,

            "message":
                "Post deleted successfully",

            "post":
                response.data

        }), 200


    except Exception as e:

        print(
            "Delete post error:",
            str(e)
        )


        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ==============================
# SERVER
# ==============================

if __name__ == "__main__":

    print(
        f"Loaded {len(users)} user(s)"
    )

    print(
        "Supabase connected"
    )

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )