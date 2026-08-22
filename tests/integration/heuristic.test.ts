/**
 * Heuristic analysis integration tests.
 *
 * Tests the multi-layer entity/API detection with real project structures
 * containing TypeScript decorators, Express routes, Java annotations, and Python models.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractEntities, extractApis } from '../../src/core/context-engine/graph-builder.js';

const TEST_DIR = join(process.cwd(), '.test-heuristic-integration');

describe('heuristic entity detection', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'auth'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'src', 'order'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect TypeORM @Entity() decorator on multiline', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'auth', 'user.ts'),
      `import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({
  name: 'users',
  schema: 'public',
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;
}`,
      'utf-8',
    );

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('User');
    expect(entities[0].file).toContain('src/auth');
  });

  it(' should detect class inheritance (extends BaseEntity)', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'auth', 'profile.ts'),
      `export class Profile extends BaseEntity {
  name: string;
  email: string;
}`,
      'utf-8',
    );

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('Profile');
  });

  it('should detect Java @Entity annotation', () => {
    mkdirSync(join(TEST_DIR, 'src', 'order'), { recursive: true });
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'Order.java'),
      `package com.example.order;

import javax.persistence.Entity;
import javax.persistence.Id;

@Entity
public class OrderItem {
  @Id
  private Long id;
}`,
      'utf-8',
    );

    const entities = extractEntities(TEST_DIR, [{ name: 'order', path: 'src/order' }]);
    expect(entities.length).toBeGreaterThanOrEqual(1);
    const orderEntity = entities.find(e => e.name === 'OrderItem');
    expect(orderEntity).toBeDefined();
  });

  it('should detect Python Django model', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'auth', 'models.py'),
      `from django.db import models

class Customer(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
`,
      'utf-8',
    );

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    expect(entities.length).toBe(1);
    expect(entities[0].name).toBe('Customer');
  });

  it('should not duplicate entities detected by multiple layers', () => {
    // File has both suffix match AND @Entity decorator
    writeFileSync(
      join(TEST_DIR, 'src', 'auth', 'UserEntity.ts'),
      `@Entity()
export class UserEntity {
  id: number;
}`,
      'utf-8',
    );

    const entities = extractEntities(TEST_DIR, [{ name: 'auth', path: 'src/auth' }]);
    // Should only appear once (Layer 1 catches it first)
    expect(entities.filter(e => e.name === 'UserEntity').length).toBe(1);
  });
});

describe('heuristic API detection', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, 'src', 'order'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect Express routes with middleware', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'routes.ts'),
      `import { Router } from 'express';
const router = Router();

router.get('/orders', authMiddleware, async (req, res) => {});
router.post('/orders', authMiddleware, validateBody, async (req, res) => {});
router.put('/orders/:id', async (req, res) => {});
`,
      'utf-8',
    );

    const apis = extractApis(TEST_DIR, [{ name: 'order', path: 'src/order' }]);
    expect(apis.length).toBeGreaterThanOrEqual(3);

    const getRoute = apis.find(a => a.method === 'GET' && a.path === '/orders');
    expect(getRoute).toBeDefined();

    const postRoute = apis.find(a => a.method === 'POST' && a.path === '/orders');
    expect(postRoute).toBeDefined();

    const putRoute = apis.find(a => a.method === 'PUT' && a.path === '/orders/:id');
    expect(putRoute).toBeDefined();
  });

  it('should detect NestJS decorator routes', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'order.controller.ts'),
      `import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller('orders')
export class OrderController {
  @Get('/')
  findAll() {}

  @Post('/create')
  create(@Body() dto: CreateOrderDto) {}
}`,
      'utf-8',
    );

    const apis = extractApis(TEST_DIR, [{ name: 'order', path: 'src/order' }]);

    // Should find NestJS routes + file name suffix route
    const getRoute = apis.find(a => a.method === 'GET' && a.path === '/');
    expect(getRoute).toBeDefined();

    const postRoute = apis.find(a => a.method === 'POST' && a.path === '/create');
    expect(postRoute).toBeDefined();
  });

  it('should detect Java Spring MVC routes', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'OrderController.java'),
      `package com.example.order;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

  @GetMapping("/list")
  public List<Order> list() {}

  @PostMapping("/create")
  public Order create(@RequestBody OrderDto dto) {}

  @DeleteMapping(value = "/{id}")
  public void delete(@PathVariable Long id) {}
}`,
      'utf-8',
    );

    const apis = extractApis(TEST_DIR, [{ name: 'order', path: 'src/order' }]);

    const getRoute = apis.find(a => a.method === 'GET' && a.path === '/list');
    expect(getRoute).toBeDefined();

    const postRoute = apis.find(a => a.method === 'POST' && a.path === '/create');
    expect(postRoute).toBeDefined();

    const deleteRoute = apis.find(a => a.method === 'DELETE');
    expect(deleteRoute).toBeDefined();
  });

  it('should detect Python Flask routes', () => {
    writeFileSync(
      join(TEST_DIR, 'src', 'order', 'routes.py'),
      `from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/orders', methods=['GET'])
def list_orders():
    return jsonify([])

@app.route('/orders', methods=['POST'])
def create_order():
    pass
`,
      'utf-8',
    );

    const apis = extractApis(TEST_DIR, [{ name: 'order', path: 'src/order' }]);

    const routes = apis.filter(a => a.path === '/orders');
    expect(routes.length).toBeGreaterThanOrEqual(2);

    const getRoute = routes.find(a => a.method === 'GET');
    expect(getRoute).toBeDefined();

    const postRoute = routes.find(a => a.method === 'POST');
    expect(postRoute).toBeDefined();
  });
});
