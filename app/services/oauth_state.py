import secrets


oauth_states = {}


def create_oauth_state(user_id: int) -> str:
    state = secrets.token_urlsafe(32)

    oauth_states[state] = user_id

    return state


def get_user_id_from_state(state: str):
    return oauth_states.pop(state, None)