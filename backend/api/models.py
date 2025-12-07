from django.db import models
from django.contrib.auth.models import AbstractUser, Permission, Group


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('coach', 'Coach'),
        ('player', 'Player'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='api_user_permissions',
    )

    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='api_user_groups',
    )


class PlayerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    height = models.FloatField(null=True, blank=True)
    rating = models.IntegerField(null=True, blank=True)
    team_name = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.user.username


class Team(models.Model):
    name = models.CharField(max_length=120)

    admin_owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owned_teams'
    )

    current_coach = models.ForeignKey(
        User, on_delete=models.SET_NULL, related_name='coached_teams',
        null=True, blank=True
    )

    players = models.ManyToManyField(
        PlayerProfile, related_name='teams', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        coach_name = self.current_coach.username if self.current_coach else "Unassigned"
        return f"{self.name} (Coach: {coach_name} | Owner: {self.admin_owner.username})"


class TrainingSession(models.Model):
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_sessions'
    )

    players = models.ManyToManyField(
        PlayerProfile,
        related_name='training_sessions',
        blank=True
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        related_name='sessions',
        null=True,
        blank=True
    )

    focus = models.CharField(max_length=255)
    duration_minutes = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.focus