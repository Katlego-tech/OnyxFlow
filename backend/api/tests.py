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


class RosterDirectoryTests(APITestCase):
    """`GET /api/coaches/` and `GET /api/players/` — the two read endpoints that
    make squad and coach assignment addressable from a client (TASKS.md T013/T014).

    Both are staff-only. A player being able to enumerate the club's other players
    is a privacy decision, and the answer here is no.
    """

    coaches_url = '/api/coaches/'
    players_url = '/api/players/'

    def setUp(self):
        self.admin = User.objects.create_user(
            username='ada', password='sheet-Metal-77', role='admin'
        )
        self.coach = User.objects.create_user(
            username='ruth', password='sheet-Metal-77', role='coach'
        )
        self.other_coach = User.objects.create_user(
            username='marcus', password='sheet-Metal-77', role='coach'
        )
        self.player = User.objects.create_user(
            username='pat', password='sheet-Metal-77', role='player'
        )

    def authenticate(self, user):
        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    # ---------------------------------------------------------------- coaches

    def test_coaches_requires_authentication(self):
        self.assertEqual(self.client.get(self.coaches_url).status_code, 401)

    def test_coaches_lists_every_coach_for_staff(self):
        for staff in (self.admin, self.coach):
            with self.subTest(role=staff.role):
                self.authenticate(staff)

                response = self.client.get(self.coaches_url)

                self.assertEqual(response.status_code, 200)
                usernames = sorted(row['username'] for row in response.json())
                self.assertEqual(usernames, ['marcus', 'ruth'])

    def test_coaches_never_includes_a_non_coach(self):
        self.authenticate(self.admin)

        roles = {row['role'] for row in self.client.get(self.coaches_url).json()}

        self.assertEqual(roles, {'coach'})

    def test_coaches_returns_only_the_fields_a_picker_needs(self):
        self.authenticate(self.admin)

        row = self.client.get(self.coaches_url).json()[0]

        self.assertEqual(set(row), {'id', 'username', 'role'})

    def test_a_player_may_not_enumerate_coaches(self):
        self.authenticate(self.player)

        self.assertEqual(self.client.get(self.coaches_url).status_code, 403)

    # ---------------------------------------------------------------- players

    def test_players_requires_authentication(self):
        self.assertEqual(self.client.get(self.players_url).status_code, 401)

    def test_players_lists_every_profile_for_staff(self):
        User.objects.create_user(username='sam', password='sheet-Metal-77', role='player')
        self.authenticate(self.coach)

        response = self.client.get(self.players_url)

        self.assertEqual(response.status_code, 200)
        usernames = sorted(row['user']['username'] for row in response.json())
        self.assertEqual(usernames, ['pat', 'sam'])

    def test_players_exposes_the_profile_id_the_write_field_expects(self):
        self.authenticate(self.coach)

        row = self.client.get(self.players_url).json()[0]

        self.assertEqual(set(row), {'id', 'user', 'rating', 'team_name'})
        self.assertEqual(row['id'], self.player.playerprofile.id)
        # The profile pk is NOT the user pk — conflating them is the bug this asserts against.
        self.assertNotEqual(row['id'], row['user']['id'])

    def test_a_player_may_not_enumerate_other_players(self):
        self.authenticate(self.player)

        self.assertEqual(self.client.get(self.players_url).status_code, 403)


class SquadAssignmentTests(APITestCase):
    """Assigning a coach and a squad — the capabilities T013/T014 unblock."""

    def setUp(self):
        self.admin = User.objects.create_user(
            username='ada', password='sheet-Metal-77', role='admin'
        )
        self.coach = User.objects.create_user(
            username='ruth', password='sheet-Metal-77', role='coach'
        )
        self.player = User.objects.create_user(
            username='pat', password='sheet-Metal-77', role='player'
        )
        self.other_admin = User.objects.create_user(
            username='bo', password='sheet-Metal-77', role='admin'
        )
        self.authenticate(self.admin)
        self.team_id = self.client.post(
            '/api/teams/', {'name': 'Senior Squad'}, format='json'
        ).json()['id']

    def authenticate(self, user):
        access = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_the_owner_can_assign_and_clear_the_current_coach(self):
        assigned = self.client.patch(
            f'/api/teams/{self.team_id}/', {'current_coach': self.coach.id}, format='json'
        )
        self.assertEqual(assigned.status_code, 200)

        detail = self.client.get(f'/api/teams/{self.team_id}/').json()
        self.assertEqual(detail['current_coach']['username'], 'ruth')

        cleared = self.client.patch(
            f'/api/teams/{self.team_id}/', {'current_coach': None}, format='json'
        )
        self.assertEqual(cleared.status_code, 200)
        self.assertIsNone(self.client.get(f'/api/teams/{self.team_id}/').json()['current_coach'])

    def test_a_non_coach_cannot_be_made_the_current_coach(self):
        response = self.client.patch(
            f'/api/teams/{self.team_id}/', {'current_coach': self.player.id}, format='json'
        )

        self.assertEqual(response.status_code, 400)

    def test_someone_who_does_not_own_the_team_cannot_assign_its_coach(self):
        self.authenticate(self.other_admin)

        response = self.client.patch(
            f'/api/teams/{self.team_id}/', {'current_coach': self.coach.id}, format='json'
        )

        self.assertEqual(response.status_code, 403)

    def test_the_owner_can_set_and_empty_the_squad(self):
        profile_id = self.player.playerprofile.id

        added = self.client.patch(
            f'/api/teams/{self.team_id}/', {'players': [profile_id]}, format='json'
        )
        self.assertEqual(added.status_code, 200)

        detail = self.client.get(f'/api/teams/{self.team_id}/').json()
        self.assertEqual([row['id'] for row in detail['players']], [profile_id])

        emptied = self.client.patch(
            f'/api/teams/{self.team_id}/', {'players': []}, format='json'
        )
        self.assertEqual(emptied.status_code, 200)
        self.assertEqual(self.client.get(f'/api/teams/{self.team_id}/').json()['players'], [])

    def test_a_session_can_be_created_with_players_attached(self):
        profile_id = self.player.playerprofile.id

        created = self.client.post(
            '/api/trainings/',
            {'focus': 'Pressing shape', 'duration_minutes': 75, 'players': [profile_id]},
            format='json',
        )

        self.assertEqual(created.status_code, 201)
        listed = self.client.get('/api/trainings/').json()[0]
        self.assertEqual([row['id'] for row in listed['players']], [profile_id])

    def test_a_team_read_carries_the_profile_id_a_client_needs_to_edit_the_squad(self):
        self.client.patch(
            f'/api/teams/{self.team_id}/',
            {'players': [self.player.playerprofile.id]},
            format='json',
        )

        squad = self.client.get(f'/api/teams/{self.team_id}/').json()['players']

        self.assertEqual(set(squad[0]), {'id', 'user', 'rating', 'team_name'})
