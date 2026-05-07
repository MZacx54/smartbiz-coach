# Generated manually to resolve deployment crash
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('brand', '0002_brandidentity_generatedcontent_delete_brand'),
    ]

    operations = [
        migrations.AddField(
            model_name='brandidentity',
            name='slug',
            field=models.SlugField(blank=True, null=True, unique=True),
        ),
    ]
