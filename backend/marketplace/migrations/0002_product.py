# Generated manually to implement Unified Product Catalog
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('brand', '0003_brandidentity_slug'),
        ('marketplace', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('image_url', models.URLField(blank=True, null=True)),
                ('category', models.CharField(blank=True, max_length=100)),
                ('is_public', models.BooleanField(default=True)),
                ('is_promoted', models.BooleanField(default=False)),
                ('stock_count', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('brand', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products', to='brand.brandidentity')),
            ],
        ),
    ]
