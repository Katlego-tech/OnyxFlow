from django.urls import path
from .views import (
    CoachListView,
    CurrentUserView,
    PlayerListView,
    PlayerProfileView,
    TeamListCreateView,
    TeamDetailView,
    TrainingListCreateView,
    TrainingDetailView,
    CoachRegisterView,
    PlayerRegisterView,
    AdminRegisterView
)

urlpatterns = [
    path('auth/register/admin/', AdminRegisterView.as_view()),
    path('auth/register/coach/', CoachRegisterView.as_view()),
    path('auth/register/player/', PlayerRegisterView.as_view()),


    path('me/', CurrentUserView.as_view(), name='current-user'),

    path('profiles/', PlayerProfileView.as_view()),

    # Staff-only directories, so a client can address a coach or a squad member
    # by the pk the write serializers expect.
    path('coaches/', CoachListView.as_view(), name='coach-list'),
    path('players/', PlayerListView.as_view(), name='player-list'),


    path('teams/', TeamListCreateView.as_view()),
    # Handles GET/PUT/PATCH/DELETE for a specific team (by ID)
    path('teams/<int:pk>/', TeamDetailView.as_view()),

    path('trainings/', TrainingListCreateView.as_view()),
    path('trainings/<int:pk>/', TrainingDetailView.as_view()),
]