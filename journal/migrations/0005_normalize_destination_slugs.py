from django.db import migrations
from django.utils.text import slugify


def normalize_destination_slugs(apps, schema_editor):
    Destination = apps.get_model("journal", "Destination")
    for destination in Destination.objects.all():
        if "'" not in destination.slug and "’" not in destination.slug:
            continue
        candidate = slugify(destination.name)
        if not candidate or candidate == destination.slug:
            continue
        if Destination.objects.filter(slug=candidate).exclude(pk=destination.pk).exists():
            continue
        destination.slug = candidate
        destination.save(update_fields=["slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("journal", "0004_explorerprogress"),
    ]

    operations = [
        migrations.RunPython(normalize_destination_slugs, migrations.RunPython.noop),
    ]
