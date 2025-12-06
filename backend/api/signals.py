from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import PlayerProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    if created and instance.role == 'player':
        PlayerProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_player_profile(sender, instance, **kwargs):
    if instance.role == 'player':
        if hasattr(instance, 'playerprofile'):
            instance.playerprofile.save()
