from django.http import Http404
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.generics import (
    RetrieveUpdateDestroyAPIView,
    ListCreateAPIView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import status

from .models import PlayerProfile, Team, TrainingSession
from .serializers import (
    PlayerSelfSerializer,
    TeamReadSerializer,
    TeamWriteSerializer,
    PlayerTrainingSerializer,
    CoachTrainingSerializer,
    TrainingWriteSerializer,
    CoachRegisterSerializer,
    PlayerRegisterSerializer,
    AdminRegisterSerializer,  # NEW
    UserSerializer,
)
from .permissions import IsAdminOrCoach, IsTeamOwner, IsAdminCoachOrAssignedPlayer  # UPDATED


class AdminRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class CoachRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CoachRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class PlayerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PlayerRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class PlayerProfileView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlayerSelfSerializer
    queryset = PlayerProfile.objects.all()

    def get_object(self):
        user = self.request.user
        try:
            return user.playerprofile
        except PlayerProfile.DoesNotExist:
            raise Http404


class TeamListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoach]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return Team.objects.filter(admin_owner=user)

        if user.role == 'coach':
            return Team.objects.filter(current_coach=user)

        # Player sees teams they are assigned to.
        return Team.objects.filter(players__user=user).distinct()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TeamWriteSerializer
        return TeamReadSerializer

    def perform_create(self, serializer):
        serializer.save()


class TeamDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Team.objects.all()
    permission_classes = [IsAuthenticated, IsTeamOwner]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TeamWriteSerializer
        return TeamReadSerializer

    def perform_destroy(self, instance):
        if instance.admin_owner != self.request.user:
            raise PermissionDenied("Only the team owner may delete this team.")
        instance.delete()


class TrainingListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrCoach]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return TrainingSession.objects.filter(created_by=user) | TrainingSession.objects.filter(
                team__admin_owner=user)

        if user.role == 'coach':
            return TrainingSession.objects.filter(created_by=user) | TrainingSession.objects.filter(
                team__current_coach=user)

        # Player sees sessions they are assigned to.
        return TrainingSession.objects.filter(players__user=user).distinct()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TrainingWriteSerializer
        if self.request.user.role in ['admin', 'coach']:
            return CoachTrainingSerializer
        return PlayerTrainingSerializer

    def perform_create(self, serializer):
        serializer.save()


class TrainingDetailView(RetrieveUpdateDestroyAPIView):
    queryset = TrainingSession.objects.all()
    # CRITICAL: IsAdminCoachOrAssignedPlayer
    permission_classes = [IsAuthenticated, IsAdminCoachOrAssignedPlayer]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TrainingWriteSerializer

        if self.request.user.role in ['admin', 'coach']:
            return CoachTrainingSerializer
        return PlayerTrainingSerializer

    def perform_update(self, serializer):
        if self.request.user.role not in ['admin', 'coach']:
            raise PermissionDenied("Only administrators and coaches can edit sessions.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role not in ['admin', 'coach']:
            raise PermissionDenied("Only administrators and coaches can delete sessions.")
        instance.delete()