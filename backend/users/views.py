from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.conf import settings
import random
from .serializers import UserSerializer, UserComplianceSerializer, AgentHireRequestSerializer
from .models import PasswordResetCode, UserCompliance, AgentHireRequest


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
            import urllib.error
            # If we are using Brevo, bypass SMTP port blocks entirely using their HTTP API (Port 443 / HTTPS)
            api_key = (settings.EMAIL_HOST_PASSWORD or '').strip()
            from_email = (settings.DEFAULT_FROM_EMAIL or '').strip()

            # Print safe debugging info to Railway logs (masking the actual key)
            key_preview = f"{api_key[:12]}..." if api_key else "None"
            print(f"DEBUG: api_key length={len(api_key)}, starts_with_xkeysib={api_key.startswith('xkeysib-')}, preview={key_preview}, sender={from_email}")

            if api_key and len(api_key) > 20:
                print("Attempting to send email via Brevo HTTP REST API (port 443)...")
                try:
                    url = "https://api.brevo.com/v3/smtp/email"
                    payload = {
                        "sender": {"email": from_email, "name": "SmartBiz Coach"},
                        "to": [{"email": email}],
                        "subject": subject,
                        "textContent": message
                    }
                    payload_bytes = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(url, data=payload_bytes, method="POST")
                    # Set headers individually to avoid any dict formatting issues
                    req.add_header("accept", "application/json")
                    req.add_header("api-key", api_key)
                    req.add_header("content-type", "application/json")

                    with urllib.request.urlopen(req, timeout=15) as response:
                        res_body = response.read().decode("utf-8")
                        print(f"Brevo HTTP API SUCCESS: status={response.status}, body={res_body}")
                        return  # Email sent - done!

                except urllib.error.HTTPError as http_err:
                    # Read the full Brevo error response body for diagnostics
                    try:
                        err_body = http_err.read().decode("utf-8")
                    except Exception:
                        err_body = "(could not read error body)"
                    print(f"Brevo HTTP API FAILED: status={http_err.code}, reason={http_err.reason}, body={err_body}")
                    print("Falling back to SMTP...")

                except Exception as api_err:
                    print(f"Brevo HTTP API FAILED (unexpected error): {api_err}")
                    print("Falling back to SMTP...")

            # Fallback to standard Django SMTP send_mail
            try:
                print("Attempting to send email via SMTP...")
                send_mail(subject, message, from_email, [email], fail_silently=False)
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


class ComplianceStatusView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        compliance, _ = UserCompliance.objects.get_or_create(user=request.user)
        serializer = UserComplianceSerializer(compliance)
        return Response(serializer.data)

    def patch(self, request):
        compliance, _ = UserCompliance.objects.get_or_create(user=request.user)
        allowed_fields = {'name_search_completed', 'business_reg_completed', 'tin_obtained_completed', 'bank_account_completed'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UserComplianceSerializer(compliance, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgentHireRequestView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AgentHireRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        hire_request = serializer.save(user=request.user)

        # Send email notification (async) to admin
        import threading, json, urllib.request, urllib.error
        def send_notification():
            api_key = (settings.EMAIL_HOST_PASSWORD or '').strip()
            from_email = (settings.DEFAULT_FROM_EMAIL or '').strip()
            admin_email = 'noreply@smartbizcoach.com.ng'

            subject = f"New Agent Hire Request: {hire_request.business_name}"
            body = (
                f"A user has requested an agent to handle their business registration.\n\n"
                f"User: {request.user.email}\n"
                f"Business Name: {hire_request.business_name}\n"
                f"Business Type: {hire_request.business_type}\n"
                f"Phone: {hire_request.phone_number}\n\n"
                f"Login to admin to view: https://api.smartbizcoach.com.ng/admin/"
            )

            if api_key and len(api_key) > 20:
                try:
                    url = "https://api.brevo.com/v3/smtp/email"
                    payload = {
                        "sender": {"email": from_email, "name": "SmartBiz Coach"},
                        "to": [{"email": admin_email}],
                        "subject": subject,
                        "textContent": body
                    }
                    payload_bytes = json.dumps(payload).encode("utf-8")
                    req = urllib.request.Request(url, data=payload_bytes, method="POST")
                    req.add_header("accept", "application/json")
                    req.add_header("api-key", api_key)
                    req.add_header("content-type", "application/json")
                    with urllib.request.urlopen(req, timeout=15) as resp:
                        print(f"Hire request email sent: {resp.status}")
                except Exception as e:
                    print(f"Failed to send hire request email: {e}")

        threading.Thread(target=send_notification).start()

        return Response({
            'message': 'Your hire request has been submitted. An agent will contact you within 24 hours.',
            'id': hire_request.id
        }, status=status.HTTP_201_CREATED)


from django.http import HttpResponse

class SetupAdminView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        html = """
        <html>
        <body style="font-family: sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
            <h2>Setup Django Admin Account</h2>
            <form method="POST">
                <div style="margin-bottom: 15px;">
                    <label>Admin Email:</label><br/>
                    <input type="email" name="email" value="meshachzax@gmail.com" style="width: 100%; padding: 8px;" required />
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Password:</label><br/>
                    <input type="password" name="password" style="width: 100%; padding: 8px;" required />
                </div>
                <div style="margin-bottom: 15px;">
                    <label>Secret Token (Only required if admin already exists):</label><br/>
                    <input type="text" name="secret_token" style="width: 100%; padding: 8px;" />
                </div>
                <button type="submit" style="background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer;">Create / Update Admin</button>
            </form>
        </body>
        </html>
        """
        return HttpResponse(html)

    def post(self, request):
        email = request.data.get('email', 'meshachzax@gmail.com')
        password = request.data.get('password')
        secret_token = request.data.get('secret_token')

        if not password:
            return HttpResponse("Password is required", status=400)

        # Allow if no superuser exists or if secret_token matches SECRET_KEY
        if User.objects.filter(is_superuser=True).exists():
            if secret_token != settings.SECRET_KEY:
                return HttpResponse("Unauthorized: Admin already exists and secret token is invalid.", status=403)

        user, created = User.objects.get_or_create(username=email, defaults={'email': email})
        user.set_password(password)
        user.is_superuser = True
        user.is_staff = True
        user.save()

        return HttpResponse(f"Successfully {'created' if created else 'updated'} admin account for {email}!<br/><br/><a href='/admin/'>Go to Django Admin</a>")

class TestGeminiView(views.APIView):
    permission_classes = []

    def get(self, request):
        import urllib.request
        import json
        import os
        from django.conf import settings
        
        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GROQ_API_KEY")
        if not api_key:
            return Response({"status": "error", "message": "No API key found in environment"}, status=500)
            
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        models = []
        try:
            with urllib.request.urlopen(list_url, timeout=10) as response:
                result = json.loads(response.read().decode())
                models = [m.get("name") for m in result.get("models", [])]
        except Exception as list_err:
            return Response({
                "status": "error",
                "message": "Failed to list models from Gemini API. Key may be invalid or restricted.",
                "error": str(list_err)
            }, status=500)

        # Try to match a model
        test_model = "gemini-1.5-flash"
        matched = False
        for candidate in ["models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-1.5-flash", "models/gemini-1.5-pro"]:
            if candidate in models:
                test_model = candidate.split("/")[-1]
                matched = True
                break
                
        if not matched and models:
            # Fallback to the first available model if it supports generateContent
            test_model = models[0].split("/")[-1]

        from smartbiz_backend.gemini_utils import make_gemini_request
        try:
            response_text = make_gemini_request("Return the word SUCCESS and nothing else.", model=test_model)
            return Response({
                "status": "success",
                "message": "Gemini API is working!",
                "selected_model": test_model,
                "response": response_text,
                "available_models": models
            })
        except Exception as e:
            return Response({
                "status": "error",
                "message": f"Gemini API call failed using model {test_model}",
                "error": str(e),
                "available_models": models
            }, status=500)
