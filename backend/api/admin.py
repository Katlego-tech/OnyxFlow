from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import PlayerProfile, Team, TrainingSession

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('id',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'admin_owner', 'current_coach', 'created_at')
    search_fields = ('name', 'admin_owner__username', 'current_coach__username')
    list_filter = ('created_at', 'current_coach', 'admin_owner')
    raw_id_fields = ('admin_owner', 'current_coach')
    filter_horizontal = ('players',)

@admin.register(PlayerProfile)
class PlayerProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'team_name', 'rating')
    search_fields = ('user__username', 'team_name')
    list_filter = ('team_name',)
    raw_id_fields = ('user',)


@admin.register(TrainingSession)
class TrainingSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'focus', 'created_by', 'team', 'duration_minutes', 'created_at')
    search_fields = ('focus', 'created_by__username', 'team__name')
    list_filter = ('created_at', 'team')
    filter_horizontal = ('players',)
