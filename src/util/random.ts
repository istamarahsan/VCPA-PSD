export function getRandomColor() {
	// Evenly distributed random javascript integer
	// https://stackoverflow.com/a/1527820

	return Math.floor(Math.random() * (2**24-1 - 0 + 1) + 0);
}

export function getRandomInteger(min: number, max: number) : number {
	// Evenly distributed random javascript integer
	// https://stackoverflow.com/a/1527820
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}