from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from .serializers import UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(request.data.get('password'))
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
