from rest_framework import serializers
from .models import User, PlayerProfile, TrainingSession, Team

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

# Use get_user_model() in production code for robustness
User = get_user_model()


class BaseRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return attrs

    @staticmethod
    def create_user_with_role(validated_data, role):
        validated_data.pop('password2')

        password = validated_data.pop('password')
        user = User(**validated_data, role=role)
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']


class PlayerRegisterSerializer(BaseRegisterSerializer):
    def create(self, validated_data):
        return self.create_user_with_role(validated_data, role='player')


class CoachRegisterSerializer(BaseRegisterSerializer):
    def create(self, validated_data):
        return self.create_user_with_role(validated_data, role='coach')


class RegisterResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    access = serializers.CharField()
    refresh = serializers.CharField()


class PlayerSelfSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = PlayerProfile
        fields = ['id', 'user', 'height', 'team_name']  # Added 'id' for R/U/D operations


class PlayerPublicSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = PlayerProfile
        fields = ['user', 'rating', 'team_name']


class TeamReadSerializer(serializers.ModelSerializer):
    coach = UserSerializer()
    players = PlayerPublicSerializer(many=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'coach', 'players', 'created_at']


class TeamWriteSerializer(serializers.ModelSerializer):
    players = serializers.PrimaryKeyRelatedField(
        many=True, queryset=PlayerProfile.objects.all(), required=False
    )

    class Meta:
        model = Team
        fields = ['id', 'name', 'players']

    def create(self, validated_data):
        players = validated_data.pop('players', [])

        coach = self.context['request'].user

        team = Team.objects.create(
            coach=coach,
            **validated_data
        )

        if players:
            team.players.set(players)

        return team


class PlayerTrainingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingSession
        fields = ['id', 'focus', 'duration_minutes', 'created_at']


class CoachTrainingSerializer(serializers.ModelSerializer):
    players = PlayerPublicSerializer(many=True)

    class Meta:
        model = TrainingSession
        fields = '__all__'


class TrainingWriteSerializer(serializers.ModelSerializer):
    players = serializers.PrimaryKeyRelatedField(
        many=True, queryset=PlayerProfile.objects.all(), required=False
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), allow_null=True, required=False
    )

    class Meta:
        model = TrainingSession
        fields = ['id' , 'players', 'team', 'focus', 'duration_minutes']

    def validate_team(self, value):
        request = self.context['request']
        if value and value.coach != request.user:
            raise serializers.ValidationError("You can only assign sessions to your own teams.")
        return value

    def create(self, validated_data):
        players = validated_data.pop('players', [])
        team = validated_data.pop('team', None)
        session = TrainingSession.objects.create(
            created_by=self.context['request'].user,
            team=team,
            **validated_data
        )
        if players:
            session.players.set(players)
        return session

    def update(self, instance, validated_data):
        players = validated_data.pop('players', None)
        team = validated_data.pop('team', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if team is not None:
            instance.team = team

        if players is not None:
            instance.players.set(players)

        instance.save()
        return instance