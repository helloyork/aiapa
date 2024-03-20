

export interface Review {
    title: string;
    rating: string;
    date: string;
    content: string;
}

export interface Specifications {
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
    specifications: Specifications;
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

export interface Summary {
    data: {[key: string]: string}[];
}

export interface SummarizedProduct extends Product {
    summary: {
        positive: Summary[] | null;
        critical: Summary[] | null[];
    };
}

export interface ConcludedProduct extends SummarizedProduct {
    conclusion: string;
}

export declare type ElementSelector = {
    querySelector?: string | string[];
    querySelectors?: { [key: string]: ElementSelector };
    evaluate?: (element: Element | { [key: string]: Element | Element[] }) => any;
}

