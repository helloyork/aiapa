

export interface Review {
    title: string;
    rating: string;
    date: string;
    content: string;
}

export interface Specificantions {
    size: string[];
    style: string[];
    color: string[];
    pattern: string[];
}

export interface ProductDetails {
    href: string;
    title: string;
    price: string;
    sales: string;
    star: string;
    specificantions: Specificantions;
    reviewNumber: number;
    productsReviewLink: string;
}

export interface ProductReview {
    positive: Review[];
    critical: Review[];
}

export interface Product extends ProductDetails {
    reviews: ProductReview;
}

export declare type ElementSelector = {
    querySelector?: string | string[];
    querySelectors?: { [key: string]: ElementSelector };
    evaluate?: (element: Element | { [key: string]: Element | Element[] }) => any;
}

