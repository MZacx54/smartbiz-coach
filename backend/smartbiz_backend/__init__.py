"""
SmartBiz Backend initialization and Python 3.14 compatibility patches.
"""

# Fix Python 3.14 copy(super()) compatibility bug in django.template.context
try:
    import django.template.context

    def _patched_base_context_copy(self):
        duplicate = self.__class__.__new__(self.__class__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    def _patched_context_copy(self):
        duplicate = self.__class__.__new__(self.__class__)
        duplicate.dicts = self.dicts[:]
        duplicate.autoescape = getattr(self, 'autoescape', True)
        duplicate.use_l10n = getattr(self, 'use_l10n', None)
        duplicate.use_tz = getattr(self, 'use_tz', None)
        duplicate.template_name = getattr(self, 'template_name', None)
        duplicate.render_context = getattr(self, 'render_context', None)
        return duplicate

    def _patched_request_context_copy(self):
        duplicate = _patched_context_copy(self)
        duplicate.request = getattr(self, 'request', None)
        duplicate._processors = getattr(self, '_processors', ())
        duplicate._processors_index = getattr(self, '_processors_index', len(duplicate._processors))
        return duplicate

    django.template.context.BaseContext.__copy__ = _patched_base_context_copy
    django.template.context.Context.__copy__ = _patched_context_copy
    django.template.context.RequestContext.__copy__ = _patched_request_context_copy
except Exception as e:
    print(f"Template context patch note: {e}")
