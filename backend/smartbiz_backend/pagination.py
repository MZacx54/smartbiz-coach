from rest_framework.pagination import PageNumberPagination


class OptionalPageNumberPagination(PageNumberPagination):
    """
    Opt-in PageNumberPagination that preserves flat array responses for existing
    clients that do not pass ?page= or ?page_size=, while bounding heavy paginated
    queries to 25 items per page (max 200).
    """

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200

    def paginate_queryset(self, queryset, request, view=None):
        if 'page' not in request.query_params and 'page_size' not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view=view)
