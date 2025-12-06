from rest_framework.permissions import BasePermission


class IsCoach(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'coach')


class IsCoachOrAssignedPlayer(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'coach':
            return True
        # obj is TrainingSession or Team depending on view; handle training sessions here
        try:
            # for TrainingSession objects
            return obj.players.filter(user=request.user).exists()
        except Exception:
            return False


class IsTeamCoach(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.coach == request.user
