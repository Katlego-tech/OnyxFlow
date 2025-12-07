from rest_framework import permissions


class IsAdminOrCoach(permissions.BasePermission):
    """Allows access if the user is authenticated and has the 'admin' or 'coach' role."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ['admin', 'coach'])


class IsTeamOwner(permissions.BasePermission):
    """Allows modification only if the user is the stable team owner (admin_owner)."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.admin_owner == request.user


class IsAdminCoachOrAssignedPlayer(permissions.BasePermission):
    """
    Allows Admin/Coach full access, and allows assigned Player read-only access to the object.
    (Used for Training Sessions)
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in ['admin', 'coach']:
            return True

        if user.role == 'player':
            if request.method in permissions.SAFE_METHODS:
                return obj.players.filter(user=user).exists()
            else:
                return False

        return False