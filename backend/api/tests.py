from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class CurrentUserViewTests(APITestCase):
    """`GET /api/me/` is what lets a client resolve the signed-in user's role.

    The token endpoint returns only `access`/`refresh`, so a client that reloads
    the page holds a valid token and no idea which screens the user may see.
    """

    url = '/api/me/'

    def authenticate(self, user):
        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_anonymous_request_is_rejected(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)

    def test_returns_the_authenticated_users_identity_and_role(self):
        coach = User.objects.create_user(
            username='ruth', password='sheet-Metal-77', role='coach'
        )
        self.authenticate(coach)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {'id': coach.id, 'username': 'ruth', 'role': 'coach'},
        )

    def test_reports_the_role_of_each_kind_of_user(self):
        for role in ('admin', 'coach', 'player'):
            with self.subTest(role=role):
                user = User.objects.create_user(
                    username=f'{role}-user', password='sheet-Metal-77', role=role
                )
                self.authenticate(user)

                response = self.client.get(self.url)

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['role'], role)

    def test_never_leaks_credentials_or_permission_flags(self):
        admin = User.objects.create_user(
            username='ada', password='sheet-Metal-77', role='admin'
        )
        self.authenticate(admin)

        response = self.client.get(self.url)

        self.assertEqual(set(response.json()), {'id', 'username', 'role'})

    def test_token_pair_endpoint_still_issues_tokens_for_these_users(self):
        User.objects.create_user(
            username='pat', password='sheet-Metal-77', role='player'
        )

        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'pat', 'password': 'sheet-Metal-77'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())

