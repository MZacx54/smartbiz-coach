"""
SmartBiz Backend initialization and compatibility patches.
"""

import copy
import sys

# Python 3.14+ copy(super()) compatibility patch for django.template.context
try:
    import django.template.context

    def _patched_base_context_copy(self):
        duplicate = self.__class__.__new__(self.__class__)
        for k, v in self.__dict__.items():
            if k == 'dicts':
                duplicate.dicts = self.dicts[:]
            elif k == 'render_context' and v is not None:
                duplicate.render_context = copy.copy(v)
            else:
                setattr(duplicate, k, v)
        return duplicate

    def _patched_context_copy(self):
        duplicate = _patched_base_context_copy(self)
        duplicate.template = getattr(self, 'template', None)
        duplicate.autoescape = getattr(self, 'autoescape', True)
        duplicate.use_l10n = getattr(self, 'use_l10n', None)
        duplicate.use_tz = getattr(self, 'use_tz', None)
        duplicate.template_name = getattr(self, 'template_name', None)
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

