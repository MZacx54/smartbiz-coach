from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from users.models import Cohort, CohortMembership

User = get_user_model()

class BulkOnboardingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(
            username='admin@smartbizcoach.com.ng',
            email='admin@smartbizcoach.com.ng',
            password='Password123!',
            business_name='SmartBiz Admin'
        )
        self.regular_user = User.objects.create_user(
            username='vendor@test.com',
            email='vendor@test.com',
            password='Password123!',
            business_name='Test Vendor',
            plan='Free'
        )

    def test_bulk_onboarding_requires_admin_or_pro(self):
        self.client.force_authenticate(user=self.regular_user)
        url = reverse('bulk-onboard')
        response = self.client.post(url, {'cohort_name': 'Test Cohort', 'members': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_onboarding_provisions_new_users(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('bulk-onboard')
        payload = {
            'cohort_name': 'NACCIMA National Pilot',
            'cohort_slug': 'naccima-national',
            'state': 'Lagos',
            'chapter': 'Lagos Chamber',
            'members': [
                {
                    'email': 'amina.katsina@msme.ng',
                    'name': 'Amina Katsina',
                    'business_name': 'Amina Grains Depot',
                    'phone': '08031234567',
                    'state': 'Katsina',
                    'sector': 'Agribusiness'
                },
                {
                    'email': 'emeka.aba@msme.ng',
                    'name': 'Emeka Obi',
                    'business_name': 'Ariaria Footwear Hub',
                    'phone': '08097654321',
                    'state': 'Abia',
                    'sector': 'Manufacturing'
                }
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertTrue(data['success'])
        self.assertEqual(data['summary']['newly_provisioned'], 2)

        # Verify users exist in DB
        u1 = User.objects.get(email='amina.katsina@msme.ng')
        self.assertEqual(u1.credits, 100)
        self.assertFalse(u1.has_onboarded)
        self.assertEqual(u1.business_name, 'Amina Grains Depot')

        cohort = Cohort.objects.get(slug='naccima-national')
        self.assertEqual(cohort.member_count(), 2)

    def test_forgot_password_does_not_leak_otp(self):
        url = reverse('forgot-password')
        response = self.client.post(url, {'email': self.regular_user.email}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify debug_code is NEVER in the response
        self.assertNotIn('debug_code', response.data)

    def test_cohort_dashboard_metrics(self):
        self.client.force_authenticate(user=self.admin_user)
        cohort = Cohort.objects.create(
            name='NACCIMA Abuja',
            slug='naccima-abuja',
            cohort_type='NACCIMA',
            organization='NACCIMA',
            state='FCT Abuja'
        )
        CohortMembership.objects.create(
            cohort=cohort,
            user=self.regular_user,
            chapter='Abuja Chamber',
            sector='Retail',
            is_activated=True
        )

        url = f"{reverse('cohort-dashboard')}?cohort=naccima-abuja"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_msmes'], 1)
        self.assertEqual(response.data['activated_msmes'], 1)
        self.assertEqual(response.data['activation_rate_pct'], 100.0)


    def test_ndpr_right_to_erasure_account_deletion(self):
        # Create user to delete
        test_user = User.objects.create_user(
            username='delete_me@test.com',
            email='delete_me@test.com',
            password='Password123!'
        )
        self.client.force_authenticate(user=test_user)
        url = reverse('profile')
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # Ensure user is deleted
        self.assertFalse(User.objects.filter(email='delete_me@test.com').exists())

    def test_dynamic_blog_post_api(self):
        from users.models import BlogPost
        post = BlogPost.objects.create(
            title='NACCIMA MSME Digital Inclusion 2026',
            slug='naccima-msme-digital-inclusion-2026',
            category='Partnerships & NGOs',
            excerpt='How NACCIMA chapters are digitizing local trade.',
            content='Full markdown advisory and framework.',
            author_name='SmartBiz Research Desk',
            is_published=True
        )

        # Anonymous list
        self.client.force_authenticate(user=None)
        list_url = reverse('blog-list')
        list_resp = self.client.get(list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(list_resp.data) >= 1)

        # Anonymous detail by slug
        detail_url = reverse('blog-detail', kwargs={'slug': 'naccima-msme-digital-inclusion-2026'})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['title'], 'NACCIMA MSME Digital Inclusion 2026')
