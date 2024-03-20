



export interface RenderableData {
    products: {
        name: string,
        href: string,
        stars: string,
        reviewNumber: number,
        sales: string,
        description: string,
        attributes: {name: string, value: string}[]
    }[]
}

