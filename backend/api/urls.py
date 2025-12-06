from django.urls import path
from .views import (
    PlayerProfileView,
    TeamListCreateView,
    TeamDetailView,
    TrainingListCreateView,
    TrainingDetailView,
    CoachRegisterView,
    PlayerRegisterView
)

urlpatterns = [
    path('profiles/', PlayerProfileView.as_view()),

    path('teams/', TeamListCreateView.as_view()),
    path('teams/<int:pk>/', TeamDetailView.as_view()),

    path('trainings/', TrainingListCreateView.as_view()),
    path('trainings/<int:pk>/', TrainingDetailView.as_view()),
    path('auth/register/coach/', CoachRegisterView.as_view()),
    path('auth/register/player/', PlayerRegisterView.as_view()),
]
