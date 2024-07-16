type SectionPredicate = number | false

export function sectionArray<R extends Record<string, any>, T extends R[] = R[]>(arr: T, predicate: (item: R, index: number) => SectionPredicate): T[] {

	//create uid array to keep track of various sections, use the index to keep track of the section
	const uidArr: number[] = [];
	//create sections array to keep track of the sections
	const sections: T[] = [];
	const left_over: R[] = [];

	for (let i = 0; i < arr.length; i++) {
		const item: R = arr[i];
		const section = predicate(item, i);
		//if the section is true, then we check if the section exists in the sections array 
		if (section) {
			const uid_idx = uidArr.findIndex((uid, index) => uid === section);
			if (uid_idx != -1) {
				sections[uid_idx].push(item);
			} else {
				//section does not exist, so we create a new section
				uidArr.push(section);
				sections.push([item] as T);
			}
		} else {
			//if the section is false, then we just add the item to the last section
			left_over.push(item);
			continue;
		}
	}

	//s_n + 1 is left over (false) items 
	//[s_1, s_2, ... s_n - 1, s_n, s_n + 1]
	return sections;
}

export function flatten(arr: any[][]) {
	return arr.reduce((acc, val) => acc.concat(val), []);
}
