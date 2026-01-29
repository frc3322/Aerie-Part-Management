from typing import Any, Dict, List, Optional

import requests
from requests_oauthlib import OAuth2Session


class OnshapeOAuthClient:
    """
    OAuth client for Onshape API.

    Implements OAuth 2.0 Authorization Code flow with PKCE support.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        base_url: str = "https://oauth.onshape.com",
        api_base_url: str = "https://cad.onshape.com",
        default_scope: str = "OAuth2Read OAuth2ReadPII",
    ):
        """
        Initialize Onshape OAuth client.

        Args:
            client_id: OAuth application client ID
            client_secret: OAuth application client secret
            redirect_uri: OAuth callback URL
            base_url: Onshape OAuth base URL
            api_base_url: Onshape API base URL
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.base_url = base_url.rstrip("/")
        self.api_base_url = api_base_url.rstrip("/")

        # OAuth endpoints
        self.authorization_url = f"{self.base_url}/oauth/authorize"
        self.token_url = f"{self.base_url}/oauth/token"
        self.user_info_url = f"{self.api_base_url}/api/users/sessioninfo"
        self.default_scope = default_scope

    def _normalize_scope(self, scope: Optional[str]) -> List[str]:
        if not scope:
            scope = self.default_scope
        if isinstance(scope, str):
            return [item for item in scope.split() if item]
        return list(scope)

    def get_authorization_url(
        self,
        state: str,
        scope: Optional[str] = None,
    ) -> str:
        """
        Build Onshape authorization URL.

        Args:
            state: CSRF protection state token
            scope: OAuth scopes (space-separated)

        Returns:
            Authorization URL to redirect user to
        """
        oauth = OAuth2Session(
            self.client_id,
            redirect_uri=self.redirect_uri,
            scope=self._normalize_scope(scope),
        )
        authorization_url, _ = oauth.authorization_url(
            self.authorization_url,
            state=state,
        )
        return authorization_url

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access and refresh tokens.

        Args:
            code: Authorization code from callback

        Returns:
            Token response dict containing:
                - access_token: OAuth access token
                - refresh_token: OAuth refresh token
                - expires_in: Token expiry time in seconds
                - token_type: Token type (usually "Bearer")

        Raises:
            requests.HTTPError: If token exchange fails
            ValueError: If response is invalid
        """
        oauth = OAuth2Session(self.client_id, redirect_uri=self.redirect_uri)
        token_data = oauth.fetch_token(
            self.token_url,
            code=code,
            client_secret=self.client_secret,
            include_client_id=True,
        )

        # Validate required fields
        required_fields = ["access_token", "refresh_token", "expires_in"]
        for field in required_fields:
            if field not in token_data:
                raise ValueError(f"Missing required field in token response: {field}")

        return token_data

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh expired access token.

        Args:
            refresh_token: OAuth refresh token

        Returns:
            Token response dict containing new tokens

        Raises:
            requests.HTTPError: If token refresh fails
            ValueError: If response is invalid
        """
        oauth = OAuth2Session(
            self.client_id,
            token={
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "access_token": "",
            },
        )
        token_data = oauth.refresh_token(
            self.token_url,
            refresh_token=refresh_token,
            client_id=self.client_id,
            client_secret=self.client_secret,
            include_client_id=True,
        )

        # Validate required fields
        required_fields = ["access_token", "expires_in"]
        for field in required_fields:
            if field not in token_data:
                raise ValueError(f"Missing required field in token response: {field}")

        # If no new refresh token provided, use the old one
        if "refresh_token" not in token_data:
            token_data["refresh_token"] = refresh_token

        return token_data

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Fetch user profile information from Onshape.

        Args:
            access_token: OAuth access token

        Returns:
            User info dict containing:
                - id: User ID
                - email: User email
                - name: User name
                - (other fields from Onshape API)

        Raises:
            requests.HTTPError: If user info fetch fails
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        response = requests.get(self.user_info_url, headers=headers)
        response.raise_for_status()
        user_data = response.json()

        return user_data

    def validate_config(self) -> bool:
        """
        Validate that OAuth configuration is complete.

        Returns:
            True if configuration is valid
        """
        return bool(self.client_id and self.client_secret and self.redirect_uri)
