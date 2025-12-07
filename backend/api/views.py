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
    UserSerializer,
)
from .permissions import IsCoachOrAssignedPlayer, IsTeamCoach


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


class TeamListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'coach':
            return Team.objects.filter(coach=user)
        return Team.objects.filter(players__user=user).distinct()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TeamWriteSerializer
        return TeamReadSerializer

    def perform_create(self, serializer):
        if self.request.user.role != 'coach':
            raise PermissionDenied("Only coaches can create teams.")
        serializer.save()


class TeamDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Team.objects.all()
    permission_classes = [IsAuthenticated, IsTeamCoach]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TeamWriteSerializer
        return TeamReadSerializer

    def perform_destroy(self, instance):
        if instance.coach != self.request.user:
            raise PermissionDenied("Only the team coach may delete this team.")
        instance.delete()


class TrainingListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'coach':
            return TrainingSession.objects.filter(created_by=user) | TrainingSession.objects.filter(team__coach=user)
        return TrainingSession.objects.filter(players__user=user).distinct()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TrainingWriteSerializer
        if self.request.user.role == 'coach':
            return CoachTrainingSerializer
        return PlayerTrainingSerializer

    def perform_create(self, serializer):
        if self.request.user.role != 'coach':
            raise PermissionDenied("Only coaches can create sessions.")
        serializer.save()


class TrainingDetailView(RetrieveUpdateDestroyAPIView):
    queryset = TrainingSession.objects.all()
    permission_classes = [IsAuthenticated, IsCoachOrAssignedPlayer]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TrainingWriteSerializer

        if self.request.user.role == 'coach':
            return CoachTrainingSerializer
        return PlayerTrainingSerializer

    def perform_update(self, serializer):
        if self.request.user.role != 'coach':
            raise PermissionDenied("Only coaches can edit sessions.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'coach':
            raise PermissionDenied("Only coaches can delete sessions.")
        instance.delete()