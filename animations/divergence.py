"""Divergence to infinity, acted out for the proof in #about.

For every height M there is an N such that f(x) > M for all x > N.

The scene reads the definition as a run of ceilings, each one broken:
the curve draws itself, a ceiling M is set, N is found and the tail beyond N
turns red-pen colour (the shaded strip right of N and below M is where the
curve never goes back). M climbs, the old ceiling stays behind as a faint
line, and the curve breaks through again. Then the view pulls back: the old
ceilings sink to the floor, the early dips shrink to small bumps, higher
ceilings come and go, and the curve leaves through the top of the frame.

f wiggles on purpose: at the first height the curve rises above M, dips back
below it, then climbs for good, so N has to clear the last dip, not just the
first crossing. N is always computed from f at the current M.

The axes are drawn by hand (not m.Axes) so the view can zoom out smoothly:
tick labels fade in and out by their spacing, like a map changing scale.

Rendered on pure white (paper) or pure black (chalkboard) so the page can
blend the clip into its background (multiply on paper, screen on dark):
    THEME=light manimgx render animations/divergence.py
    THEME=dark  manimgx render animations/divergence.py
"""
import bisect
import math
import os

import manimgx as m

THEMES = {
    "light": {"bg": "#ffffff", "ink": "#16191f", "blue": "#1d4ed8", "red": "#c8324b"},
    "dark": {"bg": "#000000", "ink": "#ecebe4", "blue": "#8db4ff", "red": "#ff8f8f"},
}
C = THEMES[os.environ.get("THEME", "light")]
m.config.background_color = C["bg"]
m.config.pixel_width, m.config.pixel_height = 1200, 800  # 3:2; the frame is 12 x 8 units
m.config.frame_rate = 30

# the plot area on screen
X0, X1, Y0, Y1 = -4.75, 4.85, -3.25, 3.15
W, H = X1 - X0, Y1 - Y0

ZOOM = 6.0  # the view widens 6 times in x by the end
CEILINGS = (1.6, 4.3, 7.6, 30.0, 80.0, 200.0)  # the values of M the scene picks, in order

X_END = 10.0 * ZOOM
STEP = 0.0025
GRID = [i * STEP for i in range(int(X_END / STEP) + 1)]


def f(x: float) -> float:
    return 0.085 * x * x + 0.9 * math.sin(1.5 * x) + 0.9


VALUES = [f(x) for x in GRID]
# suffix minimum: SUFMIN[i] = min f over GRID[i:], non-decreasing, so N is a bisect
SUFMIN = VALUES[:]
for i in range(len(SUFMIN) - 2, -1, -1):
    SUFMIN[i] = min(SUFMIN[i], SUFMIN[i + 1])


def n_for(height: float) -> float:
    """Just past the last grid point where f(x) <= height: beyond it f stays above the height."""
    i = bisect.bisect_right(SUFMIN, height)
    return min(X_END, (GRID[i - 1] if i else 0.0) + 0.04)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


class Divergence(m.Scene):
    def construct(self) -> None:
        zoom = m.ValueTracker(0.0)  # 0: x and y run to 10; 1: x to 60, y to about 250
        drawn = m.ValueTracker(0.0)  # how far along x the pen has drawn
        height = m.ValueTracker(CEILINGS[0])

        def view():
            k = ZOOM ** zoom.get_value()
            return 10.0 * k, 10.0 * k ** 1.8  # y grows a little slower than x * x, so the curve escapes the top

        def P(x, y):
            xm, ym = view()
            return [X0 + x / xm * W, Y0 + y / ym * H, 0.0]

        def curve_points(a, b, n=420):
            ym = view()[1]
            top = ym * (1 + 0.45 / H)  # let the curve run a little past the top of the axis, then stop
            pts = []
            for i in range(n + 1):
                x = a + (b - a) * i / n
                y = f(x)
                if y > top:
                    break
                pts.append(P(x, y))
            return pts

        def polyline(pts, color, width):
            v = m.VMobject()
            if len(pts) >= 2:
                v.set_points_as_corners(pts)
            return v.set_stroke(color=color, width=width).set_fill(opacity=0)

        # axes: two lines, an open arrowhead on y (it keeps going), ticks and labels that fade with the scale
        def axes():
            g = m.VGroup()
            g.add(m.Line([X0, Y0, 0], [X1, Y0, 0]).set_stroke(color=C["ink"], width=3))
            g.add(m.Line([X0, Y0, 0], [X0, Y1 + 0.55, 0]).set_stroke(color=C["ink"], width=3))
            tip = [X0, Y1 + 0.6, 0]
            for dx in (-0.14, 0.14):
                g.add(m.Line([X0 + dx, Y1 + 0.42, 0], tip).set_stroke(color=C["ink"], width=3))
            xm, ym = view()
            done = set()
            for s in (200, 100, 20, 10, 2):  # nested steps, big first; a smaller step only adds what is missing
                gap = s / ym * H
                a = clamp((gap - 0.62) / 0.35)
                if a <= 0.01:
                    continue
                j = 1
                while j * s <= ym * 1.0001:
                    v = j * s
                    if v not in done:
                        done.add(v)
                        y = Y0 + v / ym * H
                        g.add(m.Line([X0 - 0.1, y, 0], [X0, y, 0]).set_stroke(color=C["ink"], width=2.5, opacity=a))
                        g.add(m.MathTex(str(v), color=C["ink"], font_size=30).set_opacity(a).next_to([X0 - 0.1, y, 0], m.LEFT, buff=0.1))
                    j += 1
            for s in (20, 10, 2):
                gap = s / xm * W
                a = clamp((gap - 0.45) / 0.3)
                if a <= 0.01:
                    continue
                j = 1
                while j * s <= xm * 1.0001:
                    x = X0 + j * s / xm * W
                    g.add(m.Line([x, Y0, 0], [x, Y0 - 0.1, 0]).set_stroke(color=C["ink"], width=2.5, opacity=a))
                    j += 1
            return g

        ax = m.always_redraw(axes)
        self.play(m.FadeIn(ax), run_time=0.4)

        # the curve draws itself behind a pen tip
        curve = m.always_redraw(lambda: polyline(curve_points(0.0, max(0.02, drawn.get_value())), C["ink"], 5))

        def pen():
            x = drawn.get_value()
            pts = curve_points(0.0, max(0.02, x))
            a = 1.0 if 0.01 < x < 9.99 else 0.0
            return m.Dot(pts[-1], radius=0.085, color=C["ink"]).set_opacity(a)

        tip = m.always_redraw(pen)
        self.add(curve, tip)
        self.play(drawn.animate.set_value(10.0), run_time=1.4, rate_func=m.linear)
        self.remove(tip)
        # from here on the curve always runs to the right edge of the view
        drawn_to = lambda: view()[0]
        self.remove(curve)
        curve = m.always_redraw(lambda: polyline(curve_points(0.0, drawn_to()), C["ink"], 5))
        self.add(curve)

        def f_label():
            ym = view()[1]
            pts = curve_points(0.0, drawn_to())
            target = Y0 + 0.3 * H
            p = next((q for q in pts if q[1] >= target), pts[-1])
            return m.MathTex(r"f(x)", color=C["ink"], font_size=54).next_to(p, m.UL, buff=0.08)

        fl = m.always_redraw(f_label)
        self.play(m.FadeIn(fl), run_time=0.3)

        # pick a ceiling M
        n_now = lambda: n_for(height.get_value())
        m_line = m.always_redraw(lambda: m.DashedLine(P(0, height.get_value()), P(view()[0], height.get_value()), color=C["blue"]).set_stroke(width=4))
        m_label = m.always_redraw(lambda: m.MathTex("M", color=C["blue"], font_size=54).next_to(P(view()[0], height.get_value()), m.RIGHT, buff=0.14))
        self.play(m.Create(m_line), m.FadeIn(m_label), run_time=0.4)

        # there is an N: right of it the curve never comes back under M (the shaded strip stays empty)
        def zone():
            h, n, xm = height.get_value(), n_now(), view()[0]
            a, b = P(n, 0), P(xm, h)
            return m.Polygon(a, [b[0], a[1], 0], b, [a[0], b[1], 0]).set_stroke(width=0).set_fill(C["blue"], opacity=0.1)

        shade = m.always_redraw(zone)
        n_line = m.always_redraw(lambda: m.DashedLine(P(n_now(), 0), [P(n_now(), 0)[0], Y1, 0], color=C["blue"]).set_stroke(width=4))
        n_label = m.always_redraw(lambda: m.MathTex("N", color=C["blue"], font_size=54).next_to(P(n_now(), 0), m.DOWN, buff=0.14))
        tail = m.always_redraw(lambda: polyline(curve_points(n_now(), drawn_to()), C["red"], 9))
        self.add(shade)
        self.bring_to_back(shade)
        self.play(m.FadeIn(shade), m.Create(n_line), m.FadeIn(n_label), m.Create(tail), run_time=0.5)
        self.wait(0.15)

        # ceilings already broken stay behind as faint lines
        def ghosts():
            g = m.VGroup()
            for c in CEILINGS:
                if c < height.get_value() - 1e-6:
                    g.add(m.Line(P(0, c), P(view()[0], c)).set_stroke(color=C["blue"], width=2.5, opacity=0.35))
            return g

        past = m.always_redraw(ghosts)
        self.add(past)
        self.bring_to_back(past)
        self.bring_to_back(shade)

        # raise the ceiling, the curve breaks through again
        for c in CEILINGS[1:3]:
            self.play(height.animate.set_value(c), run_time=0.8)
            self.wait(0.15)

        # pull back: the dips shrink, the old ceilings sink, and it keeps going
        for c, z in zip(CEILINGS[3:], (0.4, 0.75, 1.0)):
            self.play(height.animate.set_value(c), zoom.animate.set_value(z), run_time=0.8)

        # no ceiling left: the curve has gone through the top of the frame, and the view keeps widening
        inf_a = m.ValueTracker(0.0)

        def infinity():
            end = curve_points(0.0, drawn_to())[-1]
            a = inf_a.get_value()
            return m.MathTex(r"\infty", color=C["red"], font_size=72).set_opacity(a).next_to(end, m.LEFT, buff=0.35).shift((0.2 * a - 0.2) * m.UP)

        inf = m.always_redraw(infinity)
        self.add(inf)
        qed = m.Square(side_length=0.42, color=C["ink"], fill_opacity=1).set_fill(C["ink"], opacity=1)
        qed.move_to([X1 + 0.55, Y0 + 0.3, 0])
        self.play(inf_a.animate.set_value(1.0), zoom.animate.set_value(1.04), run_time=0.45)
        # end of proof
        self.play(m.FadeIn(qed, shift=0.4 * m.DOWN), zoom.animate.set_value(1.08), run_time=0.45)
        self.play(zoom.animate.set_value(1.11), run_time=0.5, rate_func=m.linear)
