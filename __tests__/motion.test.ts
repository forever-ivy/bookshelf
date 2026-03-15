jest.mock('react-native-reanimated', () => {
  function createBuilder(kind: string) {
    return {
      config: {} as Record<string, unknown>,
      kind,
      damping(value: number) {
        this.config.damping = value;
        return this;
      },
      delay(value: number) {
        this.config.delay = value;
        return this;
      },
      duration(value: number) {
        this.config.duration = value;
        return this;
      },
      easing(value: unknown) {
        this.config.easing = value;
        return this;
      },
      mass(value: number) {
        this.config.mass = value;
        return this;
      },
      springify() {
        this.config.springify = true;
        return this;
      },
      stiffness(value: number) {
        this.config.stiffness = value;
        return this;
      },
      withInitialValues(value: unknown) {
        this.config.initialValues = value;
        return this;
      },
    };
  }

  return {
    Easing: {
      bezier: (...values: number[]) => ({ type: 'bezier', values }),
    },
    FadeIn: createBuilder('FadeIn'),
    FadeInUp: createBuilder('FadeInUp'),
    LinearTransition: createBuilder('LinearTransition'),
    SlideInDown: createBuilder('SlideInDown'),
    SlideInUp: createBuilder('SlideInUp'),
  };
});

describe('motion helpers', () => {
  function loadMotion() {
    let motion: typeof import('@/lib/presentation/motion');

    jest.isolateModules(() => {
      motion = require('@/lib/presentation/motion');
    });

    return motion!;
  }

  it('uses an upward entrance instead of a pure fade for staggered content', () => {
    const { createStaggeredFadeIn } = loadMotion();

    const animation = createStaggeredFadeIn(2, 50) as unknown as {
      config: Record<string, unknown>;
      kind: string;
    };

    expect(animation.kind).toBe('FadeInUp');
    expect(animation.config.delay).toBe(100);
  });

  it('keeps the slow entrance on the same upward motion family', () => {
    const { createSlowFadeIn } = loadMotion();

    const animation = createSlowFadeIn(1, 90) as unknown as {
      config: Record<string, unknown>;
      kind: string;
    };

    expect(animation.kind).toBe('FadeInUp');
    expect(animation.config.delay).toBe(90);
  });
});
