



export interface RenderableData {
    products: {
        name: string,
        href: string,
        stars: string,
        reviewNumber: number,
        feature: string[],
        sales: string,
        description: string,
        attributes: {name: string, value: string}[]
    }[]
}

