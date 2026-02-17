export const calculateMean = (values: number[]) => {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(4));
};

export const calculateStdDev = (values: number[]) => {
    if (values.length <= 1) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return parseFloat(Math.sqrt(variance).toFixed(4));
};

export const calculateUncertainty = (stdDev: number, resolution: number, n: number = 5) => {
    // Tipo A (Repetibilidad)
    const uA = stdDev / Math.sqrt(n);
    // Tipo B (Resolución)
    const uB = resolution / (2 * Math.sqrt(3));
    // Combinada
    const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB, 2));
    // Expandida (k=2, 95.45%)
    return parseFloat((uC * 2).toFixed(4));
};