import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IOrderProduct {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const productsToUpdate: IProduct[] = [];
    const productsToAdd: IOrderProduct[] = [];

    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) {
      throw new AppError('Customer not found', 400);
    }

    const findAllProducts = await this.productsRepository.findAllById(products);
    if (!findAllProducts.length) {
      throw new AppError('Products not found', 400);
    }

    findAllProducts.forEach(product => {
      const foundedProduct = products.find(p => p.id === product.id);
      if (!foundedProduct) {
        throw new AppError('Product not found', 400);
      }

      if (foundedProduct.quantity > product.quantity) {
        throw new AppError('Insufficient amount of product', 400);
      }

      productsToUpdate.push({
        id: product.id,
        quantity: Number(product.quantity - foundedProduct.quantity),
      });

      productsToAdd.push({
        product_id: product.id,
        price: product.price,
        quantity: Number(
          products.find(({ id }) => id === product.id)?.quantity,
        ),
      });
    });

    await this.productsRepository.updateQuantity(productsToUpdate);

    const order = await this.ordersRepository.create({
      customer,
      products: productsToAdd,
    });
    return order;
  }
}

export default CreateOrderService;
