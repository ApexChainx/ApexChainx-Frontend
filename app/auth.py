from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth


token_auth_scheme = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(token_auth_scheme)):
    """
    A dependency to protect routes.

    Verifies the Firebase ID token from the Authorization header and returns
    the decoded user data.

    Raises an HTTPException with status 401 if the token is invalid,
    expired, or not provided.
    """
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        
        token = creds.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during token verification: {e}",
        )