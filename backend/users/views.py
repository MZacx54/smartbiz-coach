from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.conf import settings
import random
from .serializers import UserSerializer
from .models import PasswordResetCode


User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(serializer.validated_data['password'])
            user.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key, 
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user': UserSerializer(user).data})
        return Response({'error': 'Invalid Credentials'}, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class UserStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Calculate stats based on real data
        # Check brand
        has_brand = False
        try:
            has_brand = hasattr(user, 'brand_identity')
        except:
            pass
        
        # Check content
        # We need to import GeneratedContent or query relation
        # user.generated_content is the related name
        content_count = user.generated_content.count() if hasattr(user, 'generated_content') else 0

        completed = 0
        if has_brand: completed += 1
        if content_count > 0: completed += 1
        if user.business_name: completed += 1 # Assumption for registration/onboarding logic

        total_tasks = 6
        
        # Simple score logic
        score = 25
        if has_brand: score += 25
        if content_count > 5: score += 10
        if user.plan == 'Pro': score += 40

        return Response({
            "grantReadinessScore": min(score, 100),
            "bizCredits": user.credits,
            "completedTasks": completed,
            "totalTasks": total_tasks
        })

class UserActionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        has_brand = hasattr(user, 'brand_identity')
        has_content = user.generated_content.exists() if hasattr(user, 'generated_content') else False
        
        actions = [
            {
                "id": '1',
                "title": 'Register CAC Business Name',
                "description": 'Official registration unlocks corporate bank accounts.',
                "type": 'URGENT',
                "isCompleted": False, # Future: check business.registration model
                "points": 50,
                "actionLink": 'COMPLIANCE' # Enums match Frontend AppView strings roughly
            },
            {
                "id": '2',
                "title": 'Create Brand Identity',
                "description": 'Generate professional logos and colors for your business.',
                "type": 'GROWTH',
                "isCompleted": has_brand,
                "points": 20,
                "actionLink": 'BRAND_BUILDER'
            },
            {
                "id": '3',
                "title": 'Post on Instagram',
                "description": 'Keep your audience engaged with a new post.',
                "type": 'GROWTH',
                "isCompleted": has_content,
                "points": 10,
                "actionLink": 'CONTENT_GENERATOR'
            },
            {
                "id": '4',
                "title": 'Create Business Plan',
                "description": 'Draft a strategy to secure grants and loans.',
                "type": 'GROWTH',
                "isCompleted": False,
                "points": 100,
                "actionLink": 'BUSINESS_PLAN'
            },
            {
                "id": '5',
                "title": 'Find Funding',
                "description": 'Match with grants from TEF, BoI, and LSETF.',
                "type": 'INFO',
                "isCompleted": False,
                "points": 50,
                "actionLink": 'GRANT_MATCHER'
            },
            {
                "id": '6',
                "title": 'Digital Marketing Setup',
                "description": 'Complete the roadmap for Facebook & WhatsApp.',
                "type": 'GROWTH',
                "isCompleted": False, 
                "points": 30,
                "actionLink": 'DIGITAL_ROADMAP'
            }
        ]
        return Response(actions)


class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Return generic success to avoid email enumeration security vulnerability
            return Response({'message': 'If a matching account exists, a reset code has been sent.'}, status=status.HTTP_200_OK)

        # Generate a 6-digit random code
        code = "".join(random.choices("0123456789", k=6))
        
        # Invalidate any previous codes
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)
        
        # Save new code
        PasswordResetCode.objects.create(user=user, code=code)
        
        # Send Email in a background thread to make the API response instant
        import threading
        import urllib.request
        import json
        subject = "SmartBiz Coach - Password Reset Code"
        message = f"Hello {user.first_name or user.username},\n\nYour password reset code is: {code}\n\nThis code is valid for 15 minutes. If you did not request a password reset, please ignore this email.\n\nBest regards,\nSmartBiz Coach Team"
        
        def send_email_async():
            # If we are using Brevo, we can bypass SMTP port blocks entirely by using their HTTP API (Port 443 / HTTPS)
            api_key = settings.EMAIL_HOST_PASSWORD
            from_email = settings.DEFAULT_FROM_EMAIL
            
            if api_key and api_key.startswith('xkeysib-'):
                print("Attempting to send email via Brevo HTTP REST API (port 443)...")
                try:
                    url = "https://api.brevo.com/v3/smtp/email"
                    headers = {
                        "accept": "application/json",
                        "api-key": api_key,
                        "content-type": "application/json"
                    }
                    data = {
                        "sender": {"email": from_email, "name": "SmartBiz Coach"},
                        "to": [{"email": email}],
                        "subject": subject,
                        "textContent": message
                    }
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(data).encode("utf-8"),
                        headers=headers,
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res_body = response.read().decode("utf-8")
                        print(f"Brevo HTTP API Success: {res_body}")
                        return
                except Exception as api_err:
                    print(f"Brevo HTTP API failed, falling back to SMTP: {api_err}")
            
            # Fallback to standard Django SMTP send_mail
            try:
                print("Attempting to send email via SMTP...")
                send_mail(
                    subject,
                    message,
                    from_email,
                    [email],
                    fail_silently=False,
                )
                print("SMTP Email sent successfully!")
            except Exception as e:
                print(f"Error sending email via SMTP: {e}")

        # Start the background thread
        email_thread = threading.Thread(target=send_email_async)
        email_thread.start()

        # In DEBUG mode, we can still print the code to the server logs for development ease
        if settings.DEBUG:
            print(f"DEBUG: Password reset code for {email} is {code}")

        return Response({'message': 'If a matching account exists, a reset code has been sent.'}, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code = request.data.get('code')
        new_password = request.data.get('new_password')

        if not email or not code or not new_password:
            return Response({'error': 'Email, code, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid request.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve the latest active reset code for this user
        reset_code = PasswordResetCode.objects.filter(user=user, code=code, is_used=False).order_by('-created_at').first()

        if not reset_code or not reset_code.is_valid():
            return Response({'error': 'Invalid or expired reset code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Code is valid, update password
        user.set_password(new_password)
        user.save()

        # Mark code as used
        reset_code.is_used = True
        reset_code.save()

        return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
