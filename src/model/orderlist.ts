import { Omit } from "../util/omit";

type OrderedEvents = 'onPointerReset' | 'onPointerMove';

class OrderedList<T extends Omit> implements Omit {
	private items: T[] = [];
	private pointer: number = 0;
	private events: { [key in OrderedEvents]: Function[] };

	constructor(items: T[] = []) {
		this.items = items;
		this.events = { 'onPointerReset': [], 'onPointerMove': [] };
	}

	public add(item: T) {
		this.items.push(item);
	}

	public on(event: OrderedEvents, callback: Function) {
		if (this.events[event]) {
			this.events[event].push(callback);
		}
	}

	public get(index: number): T {
		return this.items[index];
	}

	public find(callback: (item: T) => boolean): T | undefined {
		return this.items.find(callback);
	}

	public get current(): T {
		return this.items[this.pointer];
	}

	public get all(): T[] {
		return this.items;
	}

	public swap(index1: number, index2: number) {
		const temp = this.items[index1];
		this.items[index1] = this.items[index2];
		this.items[index2] = temp;
	}

	public next(): T {
		const item = this.items[this.pointer];
		this.pointer++;
		if (this.pointer >= this.items.length) {
			this.pointer = 0;
			this.events.onPointerReset.forEach(callback =>
				callback(this.items[this.pointer], this.pointer)
			);
		} else {
			this.events.onPointerMove.forEach(callback =>
				callback(this.items[this.pointer], this.pointer)
			);
		}
		return item;
	}

	public remove(index: number) {
		this.items = this.items.filter((item, i) => i !== index);
	}

	public removeIf(callback: (item: T) => boolean) {
		this.items = this.items.filter(item => !callback(item));
	}

	public omit() {
		return this.items.map(item => item.omit());
	}
}


export default OrderedList;
