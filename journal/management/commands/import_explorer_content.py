"""Import the curated explorer catalogue from static/js/explore/data.js."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from journal.models import (
    Destination,
    DiscoveryItem,
    ExplorerAchievement,
    ExplorerHunt,
    ExplorerQuiz,
    ExplorerWorld,
)


NODE_EXTRACTOR = r'''
(async () => {
  const data = await import("./static/js/explore/data.js");
  console.log(JSON.stringify({
    worlds: Object.values(data.WORLDS).map(w => ({
      slug: w.id, name: w.names?.en || w.id, region: w.region?.en || "",
      description: w.long?.en || w.blurb?.en || "", order: w.order || 0
    })),
    items: data.OBJECTS.map(o => ({
      key: o.id, world: o.worldId, name: o.names?.en || o.id,
      description: o.story?.en || o.summary?.en || "", card_id: o.id,
      quiz: o.quiz ? { key: "object-" + o.id, question: o.quiz.q,
        choices: o.quiz.options || [], correct_choice: o.quiz.answer || 0 } : null
    })),
    achievements: data.ACHIEVEMENTS.map(a => ({ key: a.id, title: a.title?.en || a.id,
      description: a.body?.en || a.description?.en || "", xp_reward: a.xp || 0 })),
    hunts: data.SCAVENGER_HUNTS.map(h => ({ key: h.id, title: h.title?.en || h.id,
      reward_card_id: h.rewardCard || "", xp_reward: h.xp || 40,
      world: h.worldId || "", targets: h.targets || [] }))
  }));
})().catch(error => {
  console.error(error);
  process.exit(1);
});
'''


class Command(BaseCommand):
    help = "Import normalized explorer content from the JavaScript catalogue."

    def handle(self, *args, **options):
        data_file = Path(settings.BASE_DIR) / "static" / "js" / "explore" / "data.js"
        if not data_file.exists():
            raise CommandError(f"Explorer data file not found: {data_file}")
        try:
            result = subprocess.run(
                ["node", "-e", NODE_EXTRACTOR],
                cwd=settings.BASE_DIR,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=True,
            )
            catalogue = json.loads(result.stdout)
        except FileNotFoundError as exc:
            raise CommandError("Node.js is required to import explorer content.") from exc
        except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
            detail = getattr(exc, "stderr", "") or str(exc)
            raise CommandError(f"Could not read explorer catalogue: {detail}") from exc

        with transaction.atomic():
            destination_map = {
                "kathmandu": "kathmandu-valley",
                "hunza": "hunza-valley",
                "kashgar": "kashgar",
                "karakoram": "karakoram-route",
                "dunhuang": "dunhuang",
            }
            destinations = {
                destination.slug: destination
                for destination in Destination.objects.all()
            }
            worlds = {}
            for row in catalogue["worlds"]:
                world, _ = ExplorerWorld.objects.update_or_create(
                    slug=row["slug"],
                    defaults={
                        "name": row["name"],
                        "region": row["region"],
                        "description": row["description"],
                        "destination": destinations.get(destination_map.get(row["slug"])),
                        "order": row["order"],
                        "is_active": True,
                    },
                )
                worlds[world.slug] = world

            items = {}
            quizzes = 0
            for row in catalogue["items"]:
                world = worlds.get(row["world"])
                if not world:
                    continue
                item, _ = DiscoveryItem.objects.update_or_create(
                    key=row["key"],
                    defaults={
                        "world": world,
                        "name": row["name"],
                        "description": row["description"],
                        "card_id": row["card_id"],
                        "is_active": True,
                    },
                )
                items[item.key] = item
                quiz = row.get("quiz")
                if quiz:
                    ExplorerQuiz.objects.update_or_create(
                        key=quiz["key"],
                        defaults={
                            "discovery": item,
                            "question": quiz["question"],
                            "choices": quiz["choices"],
                            "correct_choice": quiz["correct_choice"],
                            "is_active": True,
                        },
                    )
                    quizzes += 1

            for row in catalogue["achievements"]:
                ExplorerAchievement.objects.update_or_create(
                    key=row["key"],
                    defaults={
                        "title": row["title"],
                        "description": row["description"],
                        "xp_reward": row["xp_reward"],
                        "is_active": True,
                    },
                )

            for row in catalogue["hunts"]:
                hunt, _ = ExplorerHunt.objects.update_or_create(
                    key=row["key"],
                    defaults={
                        "title": row["title"],
                        "reward_card_id": row["reward_card_id"],
                        "xp_reward": row["xp_reward"],
                        "is_active": True,
                    },
                )
                hunt.target_items.set([items[key] for key in row["targets"] if key in items])

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {len(worlds)} worlds, {len(items)} discovery items, "
                f"{quizzes} quizzes, {len(catalogue['hunts'])} hunts, and "
                f"{len(catalogue['achievements'])} achievements."
            )
        )
