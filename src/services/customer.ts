import { v4 as uuidv4 } from 'uuid';
import { Customer, CustomerIdentifier, IdentifierType } from '../types/customer';
import { CustomerRepository } from '../repositories/customerRepository';

export interface CreateCustomerInput {
  displayName: string;
  identifier: CustomerIdentifier;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export class CustomerService {
  private repository: CustomerRepository;

  constructor() {
    this.repository = new CustomerRepository();
  }

  async findByIdentifier(type: IdentifierType, value: string): Promise<Customer | null> {
    return this.repository.findByIdentifier(type, value);
  }

  async getById(customerId: string): Promise<Customer | null> {
    return this.repository.getById(customerId);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const now = new Date().toISOString();
    const customer: Customer = {
      customerId: uuidv4(),
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      identifiers: [input.identifier],
      tags: [],
      isVip: false,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.save(customer);
    return customer;
  }

  async addIdentifier(customerId: string, identifier: CustomerIdentifier): Promise<void> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');

    // Check if identifier already exists
    const exists = customer.identifiers.some(
      i => i.type === identifier.type && i.value === identifier.value
    );
    if (exists) return;

    customer.identifiers.push(identifier);
    customer.updatedAt = new Date().toISOString();
    await this.repository.save(customer);
  }

  async update(customerId: string, updates: Partial<Customer>): Promise<Customer> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');

    const updated = {
      ...customer,
      ...updates,
      customerId: customer.customerId, // Prevent ID change
      updatedAt: new Date().toISOString()
    };

    await this.repository.save(updated);
    return updated;
  }

  async setVip(customerId: string, isVip: boolean): Promise<void> {
    await this.update(customerId, { isVip });
  }

  async addTag(customerId: string, tag: string): Promise<void> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('Customer not found');

    if (!customer.tags.includes(tag)) {
      customer.tags.push(tag);
      await this.update(customerId, { tags: customer.tags });
    }
  }
}
