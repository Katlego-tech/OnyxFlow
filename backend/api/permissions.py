from rest_framework import permissions


class IsCoach(permissions.BasePermission):
    """Allows access only if the user is authenticated and has the 'coach' role."""

    def has_permission(self, request, view):
        # We assume the view's permission_classes already checked is_authenticated
        return bool(request.user.role == 'coach')


class IsTeamCoach(permissions.BasePermission):
    """Allows access only if the user is the coach of the object (Team)."""

    def has_object_permission(self, request, view, obj):
        # Allow any authenticated user to read (GET, HEAD, OPTIONS)
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.coach == request.user


class IsCoachOrAssignedPlayer(permissions.BasePermission):
    """
    Allows Coach full access, and allows assigned Player read-only access to the object (TrainingSession).
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == 'coach':
            return True

        if user.role == 'player':
            if request.method in permissions.SAFE_METHODS:
                return obj.players.filter(user=user).exists()
            else:
                return False

        return False