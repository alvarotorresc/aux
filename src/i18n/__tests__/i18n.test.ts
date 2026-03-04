import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('t()', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return English translation when locale is en', async () => {
    const { t } = await import('../index');
    expect(t('site.title', 'en')).toBe('Aux — Your weekly music club');
  });

  it('should return Spanish translation when locale is es', async () => {
    const { t } = await import('../index');
    expect(t('site.title', 'es')).toBe('Aux — Tu club de musica semanal');
  });

  it('should default to en locale when second param is omitted', async () => {
    const { t } = await import('../index');
    expect(t('site.title')).toBe('Aux — Your weekly music club');
  });

  it('should return correct translation for various keys', async () => {
    const { t } = await import('../index');
    expect(t('nav.create', 'en')).toBe('Create');
    expect(t('nav.create', 'es')).toBe('Crear');
    expect(t('footer.by', 'en')).toBe('by');
    expect(t('footer.by', 'es')).toBe('por');
  });

  it('should return key string when key is missing from all locales', async () => {
    const { t } = await import('../index');

    const result = t('nonexistent.key' as any, 'en');
    expect(result).toBe('nonexistent.key');
  });

  it('should return key string when key is missing from es and en', async () => {
    const { t } = await import('../index');

    const result = t('another.missing' as any, 'es');
    expect(result).toBe('another.missing');
  });

  it('should fall back to en translation when es key is missing at runtime', async () => {
    // Mock es.json with a subset of keys (missing 'nav.create')
    vi.doMock('../es.json', () => ({
      default: { 'site.title': 'Titulo ES' },
    }));
    vi.doMock('../en.json', () => ({
      default: {
        'site.title': 'Title EN',
        'nav.create': 'Create',
      },
    }));

    const { t } = await import('../index');

    // 'nav.create' exists in en but NOT in mocked es -> exercises ?? translations.en[key]

    expect(t('nav.create' as any, 'es')).toBe('Create');

    // Key present in both -> returns es value (first branch)

    expect(t('site.title' as any, 'es')).toBe('Titulo ES');
  });
});
