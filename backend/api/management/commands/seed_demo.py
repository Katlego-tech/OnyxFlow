"""Populate the database with a believable club, so the UI can be looked at.

    python manage.py seed_demo            # idempotent — safe to re-run
    python manage.py seed_demo --reset    # delete the demo rows first

Every account here has a known password, so the command refuses to run unless
`DEBUG` is on. That is the whole safety mechanism and it is deliberate: seed data
with published credentials must never be creatable against a real deployment.

The data is shaped to exercise the UI rather than to be minimal — squads of
different sizes and sessions of different lengths, because the load bands are
drawn relative to the largest value in view and a set of identical rows would
tell you nothing about whether they work.
"""

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import PlayerProfile, Team, TrainingSession

User = get_user_model()

# Read from the environment so no working password is committed. The default is a
# self-describing placeholder, not a chosen password: these accounts are reachable
# by anyone who reads this file, which is exactly why the command refuses to run
# with `DEBUG` off. Set SEED_DEMO_PASSWORD if you want something else locally.
PASSWORD = os.environ.get('SEED_DEMO_PASSWORD') or 'changeme-local-demo'

ADMINS = [
    ('ada', 'ada@onyxflow.test'),
]

COACHES = [
    ('ruth', 'ruth@onyxflow.test'),
    ('marcus', 'marcus@onyxflow.test'),
]

# username, email, height, rating, club listed on the profile
PLAYERS = [
    ('pat', 'pat@onyxflow.test', 181.0, 78, 'Onyx Athletic'),
    ('naledi', 'naledi@onyxflow.test', 174.5, 91, 'Onyx Athletic'),
    ('tomas', 'tomas@onyxflow.test', 190.0, 66, 'Onyx Athletic'),
    ('imani', 'imani@onyxflow.test', 168.0, 84, 'Onyx Athletic'),
    ('sipho', 'sipho@onyxflow.test', 186.5, 72, 'Onyx Athletic'),
    ('yuki', 'yuki@onyxflow.test', 171.0, 88, 'Onyx Reserves'),
    ('dara', 'dara@onyxflow.test', 179.0, 59, 'Onyx Reserves'),
    ('kofi', 'kofi@onyxflow.test', 193.5, 95, 'Onyx Reserves'),
    ('lena', 'lena@onyxflow.test', 165.0, None, None),
]

# name, owner, coach, squad members — sizes differ so the squad bands differ
TEAMS = [
    ('Senior Men', 'ada', 'ruth', ['pat', 'tomas', 'sipho', 'kofi', 'dara']),
    ('Senior Women', 'ada', 'marcus', ['naledi', 'imani', 'yuki']),
    ('U21 Development', 'ada', None, ['lena']),
]

# focus, minutes, team, creator, players — lengths span 30..120 on purpose
SESSIONS = [
    ('Pressing shape', 90, 'Senior Men', 'ruth', ['pat', 'tomas', 'sipho']),
    ('Set pieces', 45, 'Senior Men', 'ruth', ['kofi', 'dara']),
    ('Recovery + mobility', 30, 'Senior Men', 'ruth', []),
    ('Transition play', 120, 'Senior Women', 'marcus', ['naledi', 'imani', 'yuki']),
    ('Finishing under fatigue', 75, 'Senior Women', 'marcus', ['naledi']),
    ('Ball retention', 60, 'U21 Development', 'ada', ['lena']),
    ('Video review', 45, None, 'ada', []),
]

DEMO_USERNAMES = (
    [name for name, _ in ADMINS]
    + [name for name, _ in COACHES]
    + [row[0] for row in PLAYERS]
)


class Command(BaseCommand):
    help = 'Create a demo club (users, teams, training sessions) for local development.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete the demo users and everything owned by them before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                'seed_demo refuses to run with DEBUG off — it creates accounts with a '
                'published password. Never run this against a real deployment.'
            )

        if options['reset']:
            self._reset()

        admins = {name: self._user(name, email, 'admin') for name, email in ADMINS}
        coaches = {name: self._user(name, email, 'coach') for name, email in COACHES}
        players = {}
        for username, email, height, rating, club in PLAYERS:
            user = self._user(username, email, 'player')
            # The post_save signal creates the profile; this fills it in.
            profile = user.playerprofile
            profile.height = height
            profile.rating = rating
            profile.team_name = club
            profile.save()
            players[username] = profile

        people = {**admins, **coaches}

        teams = {}
        for name, owner, coach, squad in TEAMS:
            team, _ = Team.objects.get_or_create(
                name=name, defaults={'admin_owner': people[owner]}
            )
            team.admin_owner = people[owner]
            team.current_coach = coaches[coach] if coach else None
            team.save()
            team.players.set([players[member] for member in squad])
            teams[name] = team

        for focus, minutes, team_name, creator, squad in SESSIONS:
            session, _ = TrainingSession.objects.get_or_create(
                focus=focus,
                created_by=people[creator],
                defaults={'duration_minutes': minutes},
            )
            session.duration_minutes = minutes
            session.team = teams[team_name] if team_name else None
            session.save()
            session.players.set([players[member] for member in squad])

        self._report(len(admins), len(coaches), len(players), len(teams))

    # ------------------------------------------------------------------ utils

    def _user(self, username, email, role):
        user, created = User.objects.get_or_create(
            username=username, defaults={'email': email, 'role': role}
        )
        if not created:
            user.email = email
            user.role = role
        # Re-set every run so a forgotten password never blocks a demo.
        user.set_password(PASSWORD)
        user.save()
        return user

    def _reset(self):
        # Teams cascade from their owner and sessions from their creator, so
        # deleting the demo users takes the rest of the demo data with them.
        deleted, _ = User.objects.filter(username__in=DEMO_USERNAMES).delete()
        Team.objects.filter(name__in=[name for name, *_ in TEAMS]).delete()
        TrainingSession.objects.filter(focus__in=[focus for focus, *_ in SESSIONS]).delete()
        self.stdout.write(self.style.WARNING(f'Reset: removed {deleted} demo rows.'))

    def _report(self, admins, coaches, players, teams):
        write = self.stdout.write
        write(self.style.SUCCESS('Seeded the demo club.'))
        write('')
        write(f'  {admins} admin, {coaches} coaches, {players} players, {teams} teams, '
              f'{len(SESSIONS)} training sessions')
        write('')
        write(f'  Every account uses the password: {PASSWORD}')
        write('')
        write('  Sign in as        to see')
        write('  ---------------   -------------------------------------------------')
        write('  ada    (admin)    all three teams, every session, owner-only controls')
        write('  ruth   (coach)    the teams she coaches')
        write('  marcus (coach)    the teams he coaches')
        write('  naledi (player)   her own profile only')
        write('')
