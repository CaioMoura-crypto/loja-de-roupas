"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { money } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

// Keep a manual stop across client remounts; a page reload creates a fresh set.
// This set is only changed by client-side navigation button events.
const manuallyPausedCarousels = new Set<string>();

type HomeCollectionsProps = {
  products: Product[];
  categories: Category[];
  onOpenProduct: (product: Product) => void;
  selectedCategoryIds?: string[];
  suspended?: boolean;
};

function ProductImage({ product }: { product: Product }) {
  const source = product.images[0];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);

  return (
    <span className="home-product-image">
      {source && !failed ? (
        <img src={source} alt="" width={480} height={640} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : <span className="home-product-placeholder">Imagem em breve</span>}
    </span>
  );
}

function ProductTile({ product, onOpenProduct, promotion = false }: {
  product: Product;
  onOpenProduct: (product: Product) => void;
  promotion?: boolean;
}) {
  const discounted = product.compareAtPrice > product.price;
  const percentage = discounted ? Math.floor((1 - product.price / product.compareAtPrice) * 100) : 0;
  const available = product.variants.some(variant => variant.stock > 0);

  return (
    <article className="home-product-card">
      <button type="button" className="home-product-button" onClick={() => onOpenProduct(product)}>
        <ProductImage product={product} />
        {!available && <span className="home-product-availability">Esgotado</span>}
        <span className="home-product-name"><span className="sr-only">Ver detalhes de </span>{product.name}</span>
        <span className="home-product-price">
          <strong><span className="sr-only">Preço atual: </span>{money(product.price)}</strong>
          {discounted && <del><span className="sr-only">Preço anterior: </span>{money(product.compareAtPrice)}</del>}
          {promotion && percentage > 0 && <span className="home-product-discount">{percentage}% de desconto</span>}
        </span>
      </button>
    </article>
  );
}

function useCategoryClock(suspended: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (suspended) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const sync = () => {
      if (interval !== null) clearInterval(interval);
      interval = document.visibilityState === "visible"
        ? setInterval(() => setTick(current => current + 1), 5000)
        : null;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (interval !== null) clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [suspended]);
  return tick;
}

function categoryMotion(position: number, tick: number, direction: -1 | 1) {
  const polarity = (tick % 2 === 1 ? 1 : -1) * direction;
  return position === 1
    ? { x: 0, y: polarity }
    : { x: position === 0 ? polarity : -polarity, y: 0 };
}

type CategoryTransition = { id: number; from: number; to: number; x: number; y: number };

function CategoryPreview({ category, products, onOpenProduct, clockTick, position }: {
  category: Category;
  products: Product[];
  onOpenProduct: (product: Product) => void;
  clockTick: number;
  position: number;
}) {
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const animationsRef = useRef<Animation[]>([]);
  const transitionVersion = useRef(0);
  const currentRef = useRef(0);
  const lastTickRef = useRef(clockTick);
  const [current, setCurrent] = useState(0);
  const [transition, setTransition] = useState<CategoryTransition | null>(null);
  const [paused, setPaused] = useState(() => manuallyPausedCarousels.has(`category:${category.id}`));
  const [activity, setActivity] = useState({ inView: false, pageVisible: false, reducedMotion: true, hovered: false, focused: false, touching: false });

  const cancelAnimations = useCallback(() => {
    transitionVersion.current += 1;
    for (const animation of animationsRef.current) animation.cancel();
    animationsRef.current = [];
  }, []);

  const stopTransition = useCallback(() => {
    cancelAnimations();
    setTransition(null);
  }, [cancelAnimations]);

  const advance = useCallback((direction: -1 | 1, animate: boolean, tick: number) => {
    if (products.length < 2) return;
    cancelAnimations();
    const from = currentRef.current;
    const to = (from + direction + products.length) % products.length;
    if (!animate || activity.reducedMotion) {
      currentRef.current = to;
      setCurrent(to);
      setTransition(null);
      return;
    }
    setTransition({ id: transitionVersion.current, from, to, ...categoryMotion(position, tick, direction) });
  }, [products.length, activity.reducedMotion, position, cancelAnimations]);

  useLayoutEffect(() => {
    if (!transition) return;
    const outgoing = cardRefs.current[transition.from];
    const incoming = cardRefs.current[transition.to];
    const finish = () => {
      if (transitionVersion.current !== transition.id) return;
      currentRef.current = transition.to;
      setCurrent(transition.to);
      setTransition(null);
    };
    if (!outgoing || !incoming || typeof outgoing.animate !== "function") {
      finish();
      return;
    }
    const options: KeyframeAnimationOptions = { duration: 500, easing: "linear", fill: "both" };
    const animations = [
      outgoing.animate([
        { transform: "translate3d(0, 0, 0)" },
        { transform: `translate3d(${transition.x * 100}%, ${transition.y * 100}%, 0)` },
      ], options),
      incoming.animate([
        { transform: `translate3d(${-transition.x * 100}%, ${-transition.y * 100}%, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ], options),
    ];
    animationsRef.current = animations;
    // A cancelled animation rejects finished; its old transition must not commit.
    void Promise.all(animations.map(animation => animation.finished)).then(finish, () => {});
    return () => {
      for (const animation of animations) animation.cancel();
      if (animationsRef.current === animations) animationsRef.current = [];
    };
  }, [transition]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => {
      setActivity(value => ({ ...value, inView: entry.isIntersecting && entry.intersectionRatio >= 0.15 }));
    }, { threshold: 0.15 });
    observer.observe(panel);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      if (preference.matches) stopTransition();
      setActivity(value => ({ ...value, reducedMotion: preference.matches }));
    };
    const syncVisibility = () => setActivity(value => ({ ...value, pageVisible: document.visibilityState === "visible" }));
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
      cancelAnimations();
    };
  }, [stopTransition, cancelAnimations]);

  const autoplay = products.length > 1 && activity.inView && activity.pageVisible && !activity.reducedMotion && !activity.hovered && !activity.focused && !activity.touching && !paused;
  useEffect(() => {
    if (lastTickRef.current === clockTick) return;
    lastTickRef.current = clockTick;
    if (autoplay && document.visibilityState === "visible") advance(1, true, clockTick);
  }, [clockTick, autoplay, advance]);

  function advanceManually(direction: -1 | 1, animate: boolean) {
    manuallyPausedCarousels.add(`category:${category.id}`);
    setPaused(true);
    advance(direction, animate, clockTick || 1);
  }

  return (
    <section
      className="home-category-preview"
      aria-labelledby={`${id}-title`}
      ref={panelRef}
      onPointerEnter={event => { if (event.pointerType !== "touch") setActivity(value => ({ ...value, hovered: true })); }}
      onPointerLeave={() => setActivity(value => ({ ...value, hovered: false }))}
      onTouchStart={() => setActivity(value => ({ ...value, touching: true }))}
      onTouchEnd={() => setActivity(value => ({ ...value, touching: false }))}
      onTouchCancel={() => setActivity(value => ({ ...value, touching: false }))}
      onFocusCapture={event => {
        setActivity(value => ({ ...value, focused: true }));
        // Keep a product button mounted and stationary if it receives focus mid-slide.
        if ((event.target as HTMLElement).closest("[data-category-index]")) stopTransition();
      }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActivity(value => ({ ...value, focused: false })); }}
    >
      <div className="home-category-copy">
        <h3 id={`${id}-title`}>{category.name}</h3>
        <Link className="home-section-link" href={`/categorias/${encodeURIComponent(category.slug)}`} aria-label={`Ver todas as peças de ${category.name}`}>
          Ver categoria
        </Link>
      </div>
      <ul id={`${id}-track`} className="home-category-track" aria-label={`Prévia de peças de ${category.name}`}>
        {products.map((product, index) => {
          const state = transition?.to === index ? "incoming" : transition?.from === index ? "outgoing" : index === current ? "current" : "hidden";
          return (
            <li
              className="home-category-card"
              key={product.id}
              ref={element => { cardRefs.current[index] = element; }}
              data-category-index={index}
              data-state={state}
              aria-hidden={index !== current}
              inert={index !== current}
            >
              <ProductTile product={product} onOpenProduct={onOpenProduct} />
            </li>
          );
        })}
      </ul>
      {products.length > 1 && (
        <div className="home-carousel-controls" role="group" aria-label={`Controles da prévia de ${category.name}`}>
          <span id={`${id}-manual-navigation`} className="sr-only">Usar uma seta interrompe a troca automática desta categoria até recarregar a página.</span>
          <button type="button" className="home-carousel-control" aria-label={`Peça anterior de ${category.name}`} aria-describedby={`${id}-manual-navigation`} aria-controls={`${id}-track`} onClick={event => advanceManually(-1, event.detail !== 0)}>
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" className="home-carousel-control" aria-label={`Próxima peça de ${category.name}`} aria-describedby={`${id}-manual-navigation`} aria-controls={`${id}-track`} onClick={event => advanceManually(1, event.detail !== 0)}>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

function PromotionsCarousel({ products, onOpenProduct }: {
  products: Product[];
  onOpenProduct: (product: Product) => void;
}) {
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const frameRef = useRef<number | null>(null);
  const queuedRef = useRef<{ direction: -1 | 1; animate: boolean } | null>(null);
  const startRef = useRef(0);
  const stepRef = useRef(0);
  const [start, setStart] = useState(0);
  const [loopReady, setLoopReady] = useState(false);
  const [paused, setPaused] = useState(() => manuallyPausedCarousels.has("promotions"));
  const [activity, setActivity] = useState({ inView: false, pageVisible: false, reducedMotion: true, hovered: false, focused: false, touching: false });
  const productKey = products.map(product => product.id).join("|");
  const canLoop = products.length > 1;

  const cancelTransition = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    queuedRef.current = null;
  }, []);

  const resetPosition = useCallback(() => {
    const track = trackRef.current;
    const slide = track?.querySelector<HTMLElement>("[data-promotion-index]");
    if (!track || !slide) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    stepRef.current = slide.getBoundingClientRect().width + gap;
    track.scrollTo({ left: canLoop ? stepRef.current : 0, behavior: "instant" });
  }, [canLoop]);

  const advance = useCallback((direction: -1 | 1, animate: boolean) => {
    const track = trackRef.current;
    if (!track || products.length < 2 || stepRef.current <= 0) return;
    if (frameRef.current !== null) {
      queuedRef.current = { direction, animate };
      return;
    }
    const finish = () => {
      frameRef.current = null;
      const next = (startRef.current + direction + products.length) % products.length;
      startRef.current = next;
      setStart(next);
    };
    if (!animate || activity.reducedMotion) {
      finish();
      return;
    }
    const origin = stepRef.current;
    const distance = direction * stepRef.current;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / 360);
      track.scrollLeft = origin + distance * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      else finish();
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [activity.reducedMotion, products.length]);

  useLayoutEffect(() => {
    if (!loopReady) {
      setLoopReady(true);
      return;
    }
    // Rotating CSS order keeps the original buttons mounted and preserves focus.
    // Rebase before paint so both resting cards are real, interactive products.
    resetPosition();
    const queued = queuedRef.current;
    if (queued) {
      queuedRef.current = null;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        advance(queued.direction, queued.animate);
      });
    }
  }, [start, productKey, loopReady, resetPosition, advance]);

  useEffect(() => {
    const panel = panelRef.current;
    const track = trackRef.current;
    if (!panel || !track) return;
    const resizeObserver = new ResizeObserver(() => {
      cancelTransition();
      resetPosition();
    });
    resizeObserver.observe(track);
    const firstSlide = track.querySelector("[data-promotion-index]");
    if (firstSlide) resizeObserver.observe(firstSlide);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      setActivity(current => ({ ...current, inView: entry.isIntersecting && entry.intersectionRatio >= 0.15 }));
    }, { threshold: 0.15 });
    intersectionObserver.observe(panel);
    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelTransition();
    };
  }, [productKey, cancelTransition, resetPosition]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      if (preference.matches) {
        cancelTransition();
        resetPosition();
      }
      setActivity(current => ({ ...current, reducedMotion: preference.matches }));
    };
    const syncVisibility = () => setActivity(current => ({ ...current, pageVisible: document.visibilityState === "visible" }));
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [cancelTransition, resetPosition]);

  const autoplay = canLoop && loopReady && activity.inView && activity.pageVisible && !activity.reducedMotion && !activity.hovered && !activity.focused && !activity.touching && !paused;
  useEffect(() => {
    if (!autoplay) return;
    const interval = window.setInterval(() => advance(1, true), 5000);
    return () => window.clearInterval(interval);
  }, [autoplay, advance]);

  function advanceManually(direction: -1 | 1, animate: boolean) {
    manuallyPausedCarousels.add("promotions");
    setPaused(true);
    advance(direction, animate);
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    setActivity(current => ({ ...current, focused: true }));
    const index = Number((event.target as HTMLElement).closest<HTMLElement>("[data-promotion-index]")?.dataset.promotionIndex);
    if (!Number.isInteger(index)) return;
    // A keyboard user may reach an original outside the current visual window.
    // Keep that same button focused while bringing its product into the window.
    cancelTransition();
    const position = (index - startRef.current + products.length) % products.length;
    if (position > 1) {
      startRef.current = index;
      setStart(index);
    } else resetPosition();
  }

  const previousProduct = products[(start - 1 + products.length) % products.length];
  const nextProduct = products[start % products.length];

  return (
    <section
      className="home-promotions"
      aria-labelledby={`${id}-title`}
      ref={panelRef}
      onPointerEnter={event => { if (event.pointerType !== "touch") setActivity(current => ({ ...current, hovered: true })); }}
      onPointerLeave={() => setActivity(current => ({ ...current, hovered: false }))}
      onTouchStart={() => setActivity(current => ({ ...current, touching: true }))}
      onTouchEnd={() => setActivity(current => ({ ...current, touching: false }))}
      onTouchCancel={() => setActivity(current => ({ ...current, touching: false }))}
      onFocusCapture={handleFocus}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setActivity(current => ({ ...current, focused: false })); }}
    >
      <div className="home-section-heading">
        <h2 id={`${id}-title`}>Promoções</h2>
        <p>Suas próximas favoritas, por menos.</p>
        <Link className="solid-button home-section-button" href="/promocoes">Ver todas as promoções</Link>
      </div>
      <div className="home-promotions-carousel">
        <ul id={`${id}-track`} className="home-promotions-track" ref={trackRef} aria-label="Peças em promoção" style={{ scrollBehavior: "auto", scrollSnapType: "none", overflowAnchor: "none" }}>
          {canLoop && loopReady && (
            <li className="home-promotion-slide" data-promotion-clone="previous" aria-hidden="true" inert style={{ order: -1 }}>
              <ProductTile product={previousProduct} onOpenProduct={onOpenProduct} promotion />
            </li>
          )}
          {products.map((product, index) => (
            <li className="home-promotion-slide" key={product.id} data-promotion-index={index} style={{ order: ((index - start) % products.length + products.length) % products.length }}>
              <ProductTile product={product} onOpenProduct={onOpenProduct} promotion />
            </li>
          ))}
          {canLoop && loopReady && (
            <li className="home-promotion-slide" data-promotion-clone="next" aria-hidden="true" inert style={{ order: products.length }}>
              <ProductTile product={nextProduct} onOpenProduct={onOpenProduct} promotion />
            </li>
          )}
        </ul>
        {canLoop && (
          <>
            <span id={`${id}-manual-navigation`} className="sr-only">Usar uma seta interrompe a troca automática das promoções até recarregar a página.</span>
            <button type="button" className="home-promotion-control is-previous" aria-label="Promoção anterior" aria-describedby={`${id}-manual-navigation`} aria-controls={`${id}-track`} onClick={event => advanceManually(-1, event.detail !== 0)}>
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <button type="button" className="home-promotion-control is-next" aria-label="Próxima promoção" aria-describedby={`${id}-manual-navigation`} aria-controls={`${id}-track`} onClick={event => advanceManually(1, event.detail !== 0)}>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default function HomeCollections({ products, categories, onOpenProduct, selectedCategoryIds, suspended = false }: HomeCollectionsProps) {
  const id = useId();
  const categoryClockTick = useCategoryClock(suspended);
  const visibleCategories = categories.filter(category => category.visible);
  const eligibleProducts = products.filter(product => product.active && visibleCategories.some(category => category.id === product.categoryId));
  const promotions = eligibleProducts.filter(product => product.compareAtPrice > product.price).slice(0, 4);
  const orderedCategories = selectedCategoryIds === undefined
    ? visibleCategories
    : [...new Set(selectedCategoryIds)].flatMap(categoryId => visibleCategories.filter(category => category.id === categoryId));
  const previews = orderedCategories
    .map(category => ({ category, products: eligibleProducts.filter(product => product.categoryId === category.id).slice(0, 3) }))
    .filter(preview => preview.products.length > 0)
    .slice(0, 3);

  if (!promotions.length && !previews.length) return null;

  return (
    <div className="home-collections">
      {promotions.length > 0 && <PromotionsCarousel key={promotions.map(product => product.id).join("|")} products={promotions} onOpenProduct={onOpenProduct} />}
      {previews.length > 0 && (
        <section className="home-categories" aria-labelledby={`${id}-categories`}>
          <div className="home-section-heading">
            <h2 id={`${id}-categories`}>Explore por categoria</h2>
            <Link className="solid-button home-section-button" href="/colecao">Ver coleção completa</Link>
          </div>
          <div className="home-category-previews">
            {previews.map((preview, position) => <CategoryPreview key={`${preview.category.id}:${preview.products.map(product => product.id).join("|")}`} {...preview} onOpenProduct={onOpenProduct} clockTick={categoryClockTick} position={position} />)}
          </div>
        </section>
      )}
    </div>
  );
}
