import { describe, expect, it } from 'vitest';
import { Canvas } from '../Canvas';
import { Rect } from '../../shapes/Rect';
import { Group } from '../../shapes/Group';
import { ActiveSelection } from '../../shapes/ActiveSelection';

const createCanvas = () =>
  new Canvas(undefined, { width: 400, height: 400, renderOnAddRemove: false });

const event = (x: number, y: number, shiftKey = false) =>
  ({
    clientX: x,
    clientY: y,
    button: 0,
    shiftKey,
  }) as any;

const dragSelect = (
  canvas: Canvas,
  from: [number, number],
  to: [number, number],
  shiftKey = false,
) => {
  canvas.__onMouseDown(event(from[0], from[1], shiftKey));
  canvas.__onMouseMove(event((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, shiftKey));
  canvas.__onMouseMove(event(to[0], to[1], shiftKey));
  canvas.__onMouseUp(event(to[0], to[1], shiftKey));
};

const makeRect = (left: number, top: number) =>
  new Rect({ left, top, width: 20, height: 20 });

describe('additive box selection', () => {
  it('keeps the previous selection and adds the collected objects when the selection key is held', () => {
    const canvas = createCanvas();
    const a = makeRect(10, 10);
    const b = makeRect(100, 100);
    canvas.add(a, b);

    canvas.setActiveObject(a);
    dragSelect(canvas, [90, 90], [200, 200], true);

    const active = canvas.getActiveObject();
    expect(active).toBeInstanceOf(ActiveSelection);
    expect(canvas.getActiveObjects()).toEqual([a, b]);
  });

  it('still replaces the selection when the selection key is not held', () => {
    const canvas = createCanvas();
    const a = makeRect(10, 10);
    const b = makeRect(100, 100);
    canvas.add(a, b);

    canvas.setActiveObject(a);
    dragSelect(canvas, [90, 90], [200, 200]);

    expect(canvas.getActiveObjects()).toEqual([b]);
  });

  it('leaves the selection untouched when the box collects nothing', () => {
    const canvas = createCanvas();
    const a = makeRect(10, 10);
    canvas.add(a);

    canvas.setActiveObject(a);
    dragSelect(canvas, [200, 200], [300, 300], true);

    expect(canvas.getActiveObjects()).toEqual([a]);
  });

  it('only collects the first level objects of the canvas root', () => {
    const canvas = createCanvas();
    const child = makeRect(20, 20);
    const group = new Group([child], { left: 0, top: 0 });
    canvas.add(group);

    // box covering only the child, which lives inside the group
    dragSelect(canvas, [15, 15], [35, 35]);
    expect(canvas.getActiveObjects()).toEqual([group]);

    // the same box adds the group to the current selection
    dragSelect(canvas, [15, 15], [35, 35], true);
    expect(canvas.getActiveObjects()).toEqual([group]);
  });

  it('collects the children of the isolated group instead of the canvas root', () => {
    const canvas = createCanvas();
    const child = makeRect(20, 20);
    const other = makeRect(200, 200);
    const group = new Group([child, other], { left: 0, top: 0 });
    const rootRect = makeRect(30, 30);
    canvas.add(group, rootRect);

    canvas.isolatedObject = group;
    dragSelect(canvas, [10, 10], [60, 60]);

    // `rootRect` is above the group, but out of the isolated scope
    expect(canvas.getActiveObjects()).toEqual([child]);
  });

  it('drops selected objects that are outside of the current scope', () => {
    const canvas = createCanvas();
    const child = makeRect(20, 20);
    const group = new Group([child], { left: 0, top: 0 });
    const rootRect = makeRect(100, 100);
    canvas.add(group, rootRect);

    // child is selected while the group is isolated
    canvas.isolatedObject = group;
    canvas.setActiveObject(child);

    // back to the root scope, the box adds the root rect only
    canvas.isolatedObject = null;
    dragSelect(canvas, [90, 90], [200, 200], true);

    expect(canvas.getActiveObjects()).toEqual([rootRect]);
  });
});
